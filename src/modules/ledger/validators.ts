import { z } from "zod";
import { moneyRequired } from "@/lib/validation";

export const LEDGER_CATEGORIES = [
  "sale",
  "installment",
  "booking_token", // #14: advance/token bookings — usually auto-posted by bookings/service.ts, listed here like sale/installment for the manual-entry dropdown too
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
  paymentMethod: z.enum(["cash", "online", "bank_transfer", "cheque"]).default("cash"),
  category: z.enum(LEDGER_CATEGORIES),
  amount: moneyRequired.refine((v) => Number(v) > 0, "Amount must be positive"),
  description: z.string().trim().min(3, "Description is required").max(500),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required"),
  branchId: z.coerce.number().int().positive("Branch is required"),
});

export type CreateEntryInput = z.infer<typeof createEntrySchema>;
