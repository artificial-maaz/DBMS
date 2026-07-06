import { z } from "zod";
import { moneyRequired } from "@/lib/validation";

export const planSchema = z.object({
  company: z.string().trim().min(2, "Company is required").max(60),
  model: z.string().trim().min(1, "Model is required").max(100),
  cashPrice: moneyRequired,
  advance: moneyRequired,
  monthly3: moneyRequired,
  total3: moneyRequired,
  monthly6: moneyRequired,
  total6: moneyRequired,
  monthly9: moneyRequired,
  total9: moneyRequired,
  monthly12: moneyRequired,
  total12: moneyRequired,
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type PlanInput = z.infer<typeof planSchema>;
