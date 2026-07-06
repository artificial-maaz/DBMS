import { z } from "zod";
import { moneyRequired, moneyZero } from "@/lib/validation";

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
    bookingId: z.coerce.number().int().positive().optional(),
    /** #5 (2026-07-06): defaults to today client-side; backdatable, never future-dated. */
    saleDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid sale date")
      .refine((v) => v <= new Date().toISOString().slice(0, 10), "Sale date cannot be in the future"),
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
    }
  });

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
