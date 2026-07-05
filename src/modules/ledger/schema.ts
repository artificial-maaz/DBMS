import {
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { branches } from "../branches/schema";
import { invoices } from "../sales/schema";

export const ledgerDirection = pgEnum("ledger_direction", ["cash_in", "cash_out"]);

/** #28: how the money physically moved. */
export const paymentMethod = pgEnum("payment_method", ["cash", "online", "bank_transfer", "cheque"]);

/**
 * Hybrid ledger (approved 2026-07-04): staff see a simple cash in/out register,
 * but rows are categorized, reference-linked, and APPEND-ONLY — the shape full
 * double-entry needs if we ever add journals on top.
 *
 * HARD RULE: no UPDATE, no DELETE — corrections are reversing entries.
 * Enforced in ledger/service.ts (no update/delete functions exist) and later
 * by a DB trigger in the migration.
 */
export const ledgerEntries = pgTable("ledger_entries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  direction: ledgerDirection("direction").notNull(),
  paymentMethod: paymentMethod("payment_method").notNull().default("cash"), // #28
  category: varchar("category", { length: 60 }).notNull(), // sale, rent, utilities, salary…
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  description: text("description").notNull(),
  invoiceId: integer("invoice_id").references(() => invoices.id), // link when sale/installment payment
  reversesEntryId: integer("reverses_entry_id"), // set on correction entries
  entryDate: date("entry_date").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
