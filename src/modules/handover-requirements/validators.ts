import { z } from "zod";

export const handoverItemSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
});

export type HandoverItemInput = z.infer<typeof handoverItemSchema>;
