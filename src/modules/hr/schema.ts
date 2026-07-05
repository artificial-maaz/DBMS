import { date, integer, numeric, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { branches } from "../branches/schema";

/**
 * One row = one salary release for one employee for one period.
 * Net = basic + allowances + commissions + bonus − deductions.
 * Release posts a ledger cash_out ('salary') — append-only, like everything.
 */
export const payrollRecords = pgTable("payroll_records", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  payNo: varchar("pay_no", { length: 30 }).notNull().unique(),
  userId: text("user_id").notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }).notNull(),
  allowances: numeric("allowances", { precision: 12, scale: 2 }).notNull().default("0"),
  commissions: numeric("commissions", { precision: 12, scale: 2 }).notNull().default("0"),
  bonus: numeric("bonus", { precision: 12, scale: 2 }).notNull().default("0"),
  deductions: numeric("deductions", { precision: 12, scale: 2 }).notNull().default("0"),
  netPayout: numeric("net_payout", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
