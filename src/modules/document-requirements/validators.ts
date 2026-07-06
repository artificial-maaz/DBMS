import { z } from "zod";

export const requirementSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
});

export type RequirementInput = z.infer<typeof requirementSchema>;
