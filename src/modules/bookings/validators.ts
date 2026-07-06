import { z } from "zod";
import { moneyRequired, optionalId } from "@/lib/validation";

export const createBookingSchema = z
  .object({
    customerId: optionalId,
    visitorId: optionalId,
    modelWanted: z.string().trim().min(2, "Model wanted is required").max(200),
    tokenAmount: moneyRequired.refine((v) => Number(v) > 0, "Token amount must be positive"),
    paymentMethod: z.enum(["cash", "online", "bank_transfer", "cheque"]).default("cash"),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    branchId: z.coerce.number().int().positive("Branch is required"),
  })
  .refine((v) => v.customerId || v.visitorId, {
    message: "Link this booking to a customer or a visitor",
    path: ["customerId"],
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
