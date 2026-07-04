import { z } from "zod";
import { phoneNumber } from "@/lib/validation";

/** Accepts 42201-1234567-1, 4220112345671, or with stray spaces; normalized to dashed form. */
const cnic = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(/\s/g, "") : v),
  z
    .string()
    .regex(/^(\d{5}-\d{7}-\d|\d{13})$/, "CNIC must be 13 digits (e.g. 42201-1234567-1)")
    .transform((v) => (v.includes("-") ? v : `${v.slice(0, 5)}-${v.slice(5, 12)}-${v.slice(12)}`)),
);

export const createCustomerSchema = z.object({
  fullName: z.string().trim().min(2, "Name is required").max(120),
  phone: phoneNumber,
  cnic: cnic.optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").max(120).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  city: z.string().trim().max(60).optional().or(z.literal("")),
  branchId: z.coerce.number().int().positive("Branch is required"),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
