import { z } from "zod";

export const LEDGER_CATEGORIES = [
  "sale",
  "installment",
  "purchase",
  "rent",
  "utilities",
  "salary",
  "fuel",
  "stationery",
  "refreshments",
  "repair",
  "other",
] as const;

export const createEntrySchema = z.object({
  direction: z.enum(["cash_in", "cash_out"]),
  category: z.enum(LEDGER_CATEGORIES),
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount").refine((v) => Number(v) > 0, "Amount must be positive"),
  description: z.string().trim().min(3, "Description is required").max(500),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required"),
  branchId: z.coerce.number().int().positive("Branch is required"),
});

export type CreateEntryInput = z.infer<typeof createEntrySchema>;
