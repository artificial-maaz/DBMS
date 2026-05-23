import { z } from "zod";
import { moneyRequired, moneyZero } from "@/lib/validation";

/**
 * Extracted from service.ts (2026-08-09) so the module matches the convention
 * every other domain follows. Nothing here changed in the move except the
 * addition of the #19 edit schema at the bottom.
 */
export const supplierSchema = z.object({
  name: z.string().trim().min(2, "Supplier name required").max(120),
  contactPerson: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").max(120).optional().or(z.literal("")),
  city: z.string().trim().max(60).optional().or(z.literal("")),
  ntn: z.string().trim().max(30).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

/** Dynamic rows arrive as a single JSON field (same pattern as sale guarantors). */
const jsonArray = <T extends z.ZodTypeAny>(inner: T, min: number, message: string) =>
  z.preprocess((v) => {
    if (typeof v !== "string" || v.trim() === "") return [];
    try {
      return JSON.parse(v);
    } catch {
      return v; // let zod reject it with a clear message rather than silently dropping input
    }
  }, z.array(inner).min(min, message));

/** #15: one PO line. */
export const poItemSchema = z.object({
  model: z.string().trim().min(2, "Model required").max(120),
  color: z.string().trim().max(40).optional().or(z.literal("")),
  qtyOrdered: z.coerce.number().int().min(1, "Qty must be at least 1"),
  unitCost: moneyRequired,
});

export const purchaseSchema = z.object({
  supplierId: z.coerce.number().int().positive("Supplier is required"),
  branchId: z.coerce.number().int().positive("Branch is required"),
  items: jsonArray(poItemSchema, 1, "Add at least one line item"),
  amountPaid: moneyZero,
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date required"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

/**
 * #19 edit schema. Two deliberate absences: `branchId` (the payment already
 * posted to that branch's ledger) and `amountPaid` (the ledger is append-only;
 * money moves only through payPurchase). A field that cannot be edited should
 * not be accepted and then ignored — it should never arrive at all.
 *
 * `id` present = an existing line; absent = a newly added one.
 */
export const purchaseEditItemSchema = poItemSchema.extend({
  id: z.coerce.number().int().positive().optional(),
});

export const purchaseEditSchema = z.object({
  supplierId: z.coerce.number().int().positive("Supplier is required"),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date required"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  items: jsonArray(purchaseEditItemSchema, 1, "A purchase must keep at least one line item"),
});
