import { integer, numeric, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { branches } from "../branches/schema";
import { customers } from "../customers/schema";
import { visitors } from "../visitors/schema";
import { invoices } from "../sales/schema";
import { paymentMethod } from "../ledger/schema";

export const bookingStatus = pgEnum("booking_status", ["open", "converted", "cancelled", "refunded"]);

/**
 * #14 (2026-07-06): advance/token bookings — someone puts down cash (5k, 10k,
 * whatever) to reserve a model before it's necessarily even in stock. Linked
 * to EITHER a customer or a visitor (app-enforces "at least one" — see
 * validators.ts — no duplicate contact info stored here).
 * The token amount posts to the ledger as cash-in immediately (service.ts) so
 * it's visible money, not just a promise. `convertedInvoiceId` is set once the
 * booking becomes a real sale — see the reconciliation note in service.ts.
 */
export const bookings = pgTable("bookings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id").references(() => customers.id),
  visitorId: integer("visitor_id").references(() => visitors.id),
  modelWanted: varchar("model_wanted", { length: 200 }).notNull(),
  tokenAmount: numeric("token_amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: paymentMethod("payment_method").notNull().default("cash"),
  status: bookingStatus("status").notNull().default("open"),
  notes: text("notes"),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  // The original cash-in entry this token posted — refunding reverses THIS specific row.
  ledgerEntryId: integer("ledger_entry_id"),
  convertedInvoiceId: integer("converted_invoice_id").references(() => invoices.id),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
