import { boolean, date, integer, numeric, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

/**
 * #16 (2026-07-06): the official rate card — cash price, advance, and
 * monthly/total figures at 3/6/9/12 months, per company per model. Fixed
 * 4-duration columns rather than a normalized child table: every rate card
 * Sir deals in (United, Yadea, Ramza, Honda) uses exactly 3/6/9/12 months,
 * so this matches reality without over-building; a 5th duration later is a
 * migration, not a redesign.
 *
 * This is a REFERENCE table, not a sale record — installment_schedules
 * (sales module) is the real per-invoice amortization. This just feeds the
 * New Sale form's auto-fill so staff don't retype company-approved numbers,
 * and stays editable at sale time (business rule: custom advance/monthly per
 * customer is still allowed).
 */
export const installmentPlans = pgTable(
  "installment_plans",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    company: varchar("company", { length: 60 }).notNull(), // e.g. "United", "Yadea", "Ramza", "Honda"
    model: varchar("model", { length: 100 }).notNull(),
    cashPrice: numeric("cash_price", { precision: 12, scale: 2 }).notNull(),
    advance: numeric("advance", { precision: 12, scale: 2 }).notNull(),
    monthly3: numeric("monthly_3", { precision: 12, scale: 2 }).notNull(),
    total3: numeric("total_3", { precision: 12, scale: 2 }).notNull(),
    monthly6: numeric("monthly_6", { precision: 12, scale: 2 }).notNull(),
    total6: numeric("total_6", { precision: 12, scale: 2 }).notNull(),
    monthly9: numeric("monthly_9", { precision: 12, scale: 2 }).notNull(),
    total9: numeric("total_9", { precision: 12, scale: 2 }).notNull(),
    monthly12: numeric("monthly_12", { precision: 12, scale: 2 }).notNull(),
    total12: numeric("total_12", { precision: 12, scale: 2 }).notNull(),
    effectiveDate: date("effective_date").notNull(), // the "w.e.f" date printed on the card
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("installment_plans_company_model_idx").on(t.company, t.model)],
);
