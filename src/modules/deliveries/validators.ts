import { z } from "zod";
import { moneyOptional, optionalId } from "@/lib/validation";

/** One physical unit on the challan. */
export const deliveryLineSchema = z.object({
  make: z.string().trim().min(1, "Make is required").max(60),
  model: z.string().trim().min(1, "Model is required").max(100),
  variant: z.string().trim().max(100).optional().or(z.literal("")),
  color: z.string().trim().max(40).optional().or(z.literal("")),
  chassisNo: z.string().trim().min(3, "Chassis no. required").max(50),
  engineNo: z.string().trim().min(3, "Engine no. required").max(50),
  purchasePrice: moneyOptional,
  salePrice: moneyOptional,
});

/**
 * Dynamic unit rows don't map onto plain FormData, so the form sends them as
 * one hidden JSON field — parsed here before validation (same pattern as
 * guarantors on the sale form).
 */
export const createDeliverySchema = z.object({
  branchId: z.coerce.number().int().positive("Branch is required"),
  supplierId: optionalId,
  companyName: z.string().trim().max(120).optional().or(z.literal("")),
  challanNo: z.string().trim().max(60).optional().or(z.literal("")),
  batchRef: z.string().trim().max(60).optional().or(z.literal("")),
  deliveredOn: z.string().min(10, "Delivery date is required"),
  transportPlate: z.string().trim().max(20).optional().or(z.literal("")),
  driverName: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  vehicles: z.preprocess(
    (v) => (typeof v === "string" ? JSON.parse(v || "[]") : v),
    z.array(deliveryLineSchema).min(1, "Add at least one vehicle to this delivery."),
  ),
});

export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;
