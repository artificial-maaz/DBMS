import { z } from "zod";
import { moneyOptional, moneyRequired, moneyZero, optionalId, phoneNumber } from "@/lib/validation";

/** Same normalization as customers/staff CNIC: dashed or bare 13 digits, both accepted. */
const cnic = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(/\s/g, "") : v),
  z
    .string()
    .regex(/^(\d{5}-\d{7}-\d|\d{13})$/, "CNIC must be 13 digits (e.g. 42201-1234567-1)")
    .transform((v) => (v.includes("-") ? v : `${v.slice(0, 5)}-${v.slice(5, 12)}-${v.slice(12)}`)),
);

const guarantorSchema = z.object({
  fullName: z.string().trim().min(2, "Guarantor name is required").max(120),
  cnic,
  phone: phoneNumber,
  address: z.string().trim().max(500).optional().or(z.literal("")),
});

/** Sent as one hidden JSON field from the form (dynamic add/remove rows don't map cleanly to plain FormData). */
const guarantorsField = z.preprocess((v) => {
  if (typeof v !== "string" || v.trim() === "") return [];
  try {
    return JSON.parse(v);
  } catch {
    return v; // let zod reject it below with a clear message rather than silently dropping bad input
  }
}, z.array(guarantorSchema));

/**
 * #20 (2026-07-06): checklist result per installment sale. NOT a hard gate —
 * a row can be `provided: false` with a compensation note instead of blocking
 * the sale, so this is deliberately unvalidated beyond shape (no min-length,
 * no "must all be true" rule).
 */
const invoiceDocumentSchema = z.object({
  requirementId: z.coerce.number().int().positive(),
  requirementName: z.string().trim().min(1).max(120),
  provided: z.boolean(),
  compensationAmount: moneyOptional,
  compensationNote: z.string().trim().max(500).optional().or(z.literal("")),
});

const documentsField = z.preprocess((v) => {
  if (typeof v !== "string" || v.trim() === "") return [];
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}, z.array(invoiceDocumentSchema));

/**
 * #13 (2026-08-09): physical handover checklist, EVERY sale (unlike documents,
 * which are installment-only). Same deliberate looseness — an unticked item
 * carries a note instead of blocking the sale.
 */
const invoiceHandoverSchema = z.object({
  requirementId: z.coerce.number().int().positive(),
  requirementName: z.string().trim().min(1).max(120),
  handedOver: z.boolean(),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

const handoversField = z.preprocess((v) => {
  if (typeof v !== "string" || v.trim() === "") return [];
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}, z.array(invoiceHandoverSchema));

/**
 * Parts sold on the invoice (#, 2026-08-16). Only the part and the quantity are
 * accepted — the PRICE is deliberately not taken from the client. The server
 * reads the current retail price from the parts table, so a crafted request
 * cannot sell a battery for one rupee. Negotiation still works: that is what
 * the invoice-level discount field is for.
 */
const salePartSchema = z.object({
  partId: z.coerce.number().int().positive(),
  qty: z.coerce.number().int().min(1, "Quantity must be at least 1"),
});

const partsField = z.preprocess((v) => {
  if (typeof v !== "string" || v.trim() === "") return [];
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}, z.array(salePartSchema));

export const createSaleSchema = z
  .object({
    customerId: z.coerce.number().int().positive("Customer is required"),
    vehicleId: z.coerce.number().int().positive("Vehicle is required"),
    salePrice: moneyRequired,
    discount: moneyZero,
    registrationFeeGovt: moneyZero,
    registrationFeeProfit: moneyZero,
    commissionAmount: moneyZero,
    settlementPlan: z.enum(["cash", "installment"]),
    downpayment: moneyZero,
    months: z.coerce.number().int().min(1).max(60).optional(),
    totalMarkup: moneyZero,
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    /** #14 (2026-07-06): apply an open booking's token as downpayment credit. */
    bookingId: optionalId,
    /** Sir 2026-07-14: checkbox — warranty card photo sent to the company. */
    warrantyCardSent: z.preprocess((v) => v === "on" || v === true || v === "true", z.boolean()).default(false),
    /** #5 (2026-07-06): defaults to today client-side; backdatable, never future-dated. */
    saleDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid sale date")
      .refine((v) => v <= new Date().toISOString().slice(0, 10), "Sale date cannot be in the future"),
    /** #21 (2026-07-06): required for installment sales, at least one; forbidden/ignored for cash. */
    guarantors: guarantorsField,
    /** #20 (2026-07-06): optional checklist snapshot, installment sales only; never required. */
    documents: documentsField,
    /** #13 (2026-08-09): physical handover snapshot, every sale; never required. */
    handovers: handoversField,
    /** Spare parts / accessories sold alongside the vehicle. Priced server-side. */
    parts: partsField,
  })
  .superRefine((v, ctx) => {
    if (v.settlementPlan === "installment") {
      if (!v.months) {
        ctx.addIssue({ code: "custom", message: "Months required for installment plan", path: ["months"] });
      }
      const total =
        Number(v.salePrice) - Number(v.discount) + Number(v.registrationFeeGovt) + Number(v.registrationFeeProfit);
      if (Number(v.downpayment) >= total) {
        ctx.addIssue({ code: "custom", message: "Downpayment must be less than the total", path: ["downpayment"] });
      }
      if (v.guarantors.length < 1) {
        ctx.addIssue({
          code: "custom",
          message: "At least one guarantor is required for an installment sale",
          path: ["guarantors"],
        });
      }
    }
  });

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
