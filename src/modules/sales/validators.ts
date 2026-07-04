import { z } from "zod";

const money = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount")
  .or(z.literal(""))
  .transform((v) => (v === "" ? "0" : v));

export const createSaleSchema = z
  .object({
    customerId: z.coerce.number().int().positive("Customer is required"),
    vehicleId: z.coerce.number().int().positive("Vehicle is required"),
    salePrice: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Sale price is required"),
    discount: money,
    registrationFeeGovt: money,
    registrationFeeProfit: money,
    commissionAmount: money,
    settlementPlan: z.enum(["cash", "installment"]),
    downpayment: money,
    months: z.coerce.number().int().min(1).max(60).optional(),
    totalMarkup: money,
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
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
