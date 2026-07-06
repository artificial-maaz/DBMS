import { z } from "zod";
import { moneyOptional, phoneNumber } from "@/lib/validation";

/** Same tolerant CNIC pattern used across customers/staff — optional here (walk-ins rarely carry ID). */
const cnicOptional = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(/\s/g, "") : v),
  z
    .string()
    .regex(/^(\d{5}-\d{7}-\d|\d{13})?$/, "CNIC must be 13 digits")
    .transform((v) => (v && !v.includes("-") ? `${v.slice(0, 5)}-${v.slice(5, 12)}-${v.slice(12)}` : v)),
);

export const createVisitorSchema = z.object({
  fullName: z.string().trim().min(2, "Name is required").max(120),
  phone: phoneNumber,
  cnic: cnicOptional.optional(),
  interest: z.string().trim().max(200).optional().or(z.literal("")),
  budget: moneyOptional,
  source: z.enum(["walk_in", "event", "referral", "online"]),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  followUpDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid follow-up date")
    .optional()
    .or(z.literal("")),
  branchId: z.coerce.number().int().positive("Branch is required"),
});

export const updateVisitorSchema = createVisitorSchema.extend({
  status: z.enum(["new", "contacted", "follow_up", "converted", "lost"]),
});

export type CreateVisitorInput = z.infer<typeof createVisitorSchema>;
export type UpdateVisitorInput = z.infer<typeof updateVisitorSchema>;
