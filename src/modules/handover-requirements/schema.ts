import { boolean, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * #13 (Sir, 2026-08-09) — the physical handover checklist: what actually leaves
 * the showroom with the bike (charger, mirrors, toolkit) and what the salesperson
 * must confirm at the door (scratchless, customer photo, review requested).
 *
 * Distinct from `document_requirements` on purpose. That list is *agreement
 * paperwork* and only exists for installment sales; this one is *goods and
 * checks* and applies to every sale, because a cash buyer's missing mirrors is
 * exactly as much of a problem as an installment buyer's.
 *
 * Same management rules as the document list: Creator/Owner add, rename, retire.
 * Retire, never delete — `invoice_handovers` snapshots the name at sale time, so
 * retiring or renaming an item never rewrites a past sale.
 */
export const handoverRequirements = pgTable("handover_requirements", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
