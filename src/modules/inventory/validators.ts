import { z } from "zod";
import { moneyOptional } from "@/lib/validation";

export const createVehicleSchema = z.object({
  make: z.string().trim().min(1, "Make is required").max(60),
  model: z.string().trim().min(1, "Model is required").max(100),
  variant: z.string().trim().max(100).optional().or(z.literal("")),
  color: z.string().trim().max(40).optional().or(z.literal("")),
  chassisNo: z.string().trim().min(3, "Chassis no. required").max(50),
  engineNo: z.string().trim().min(3, "Engine no. required").max(50),
  purchasePrice: moneyOptional,
  salePrice: moneyOptional,
  branchId: z.coerce.number().int().positive("Branch is required"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

/** #3 (2026-07-06): edit specs — branchId excluded (transfers go through Gate Pass, not a direct edit). */
export const updateVehicleSchema = z.object({
  make: z.string().trim().min(1, "Make is required").max(60),
  model: z.string().trim().min(1, "Model is required").max(100),
  variant: z.string().trim().max(100).optional().or(z.literal("")),
  color: z.string().trim().max(40).optional().or(z.literal("")),
  chassisNo: z.string().trim().min(3, "Chassis no. required").max(50),
  engineNo: z.string().trim().min(3, "Engine no. required").max(50),
  purchasePrice: moneyOptional,
  salePrice: moneyOptional,
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
