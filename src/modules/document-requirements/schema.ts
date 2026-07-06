import { boolean, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Manageable checklist of documents/items relevant to installment sales
 * (#20, 2026-07-06) — e.g. CNIC copy, utility bill. Creator/Owner can add,
 * rename, or retire entries at any time (retire, never delete — historical
 * `invoice_documents` rows snapshot the name, so retiring never breaks past
 * invoices). Not a hard gate at sale time: a missing item can be waived with
 * a compensation note instead of blocking the sale (Sir's explicit call).
 */
export const documentRequirements = pgTable("document_requirements", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
