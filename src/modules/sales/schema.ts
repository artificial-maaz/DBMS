import { sql } from "drizzle-orm";
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
import { customers } from "../customers/schema";
import { vehicles } from "../inventory/schema";

export const settlementPlan = pgEnum("settlement_plan", ["cash", "installment"]);

export const invoiceStatus = pgEnum("invoice_status", [
  "active",    // finalized, in force (cash: paid; installment: schedule running)
  "settled",   // installment plan fully paid off
  "cancelled", // reversed — never deleted (audit rule)
]);

export const installmentStatus = pgEnum("installment_status", [
  "pending",
  "paid",
  "overdue",
]);

/**
 * Sales invoice. invoiceNo is per-branch sequential, e.g. LHR-2026-0001
 * (generated in sales/service.ts inside a transaction).
 * Registration fee is split: govt portion + showroom profit portion.
 * Commission is recorded at invoice time (business rule 2026-07-04).
 */
export const invoices = pgTable("invoices", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  invoiceNo: varchar("invoice_no", { length: 30 }).notNull().unique(),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  salespersonId: text("salesperson_id").notNull(), // auth user id
  settlementPlan: settlementPlan("settlement_plan").notNull().default("cash"),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 14, scale: 2 }).notNull().default("0"),
  registrationFeeGovt: numeric("registration_fee_govt", { precision: 12, scale: 2 }).notNull().default("0"),
  registrationFeeProfit: numeric("registration_fee_profit", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(),
  downpayment: numeric("downpayment", { precision: 14, scale: 2 }).notNull().default("0"),
  balanceDue: numeric("balance_due", { precision: 14, scale: 2 }).notNull().default("0"),
  commissionAmount: numeric("commission_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  status: invoiceStatus("status").notNull().default("active"),
  notes: text("notes"),
  createdBy: text("created_by").notNull(),
  /**
   * #5 (2026-07-06): the BUSINESS date of the sale — editable at entry so past
   * sales can be backdated. Drives invoice numbering, ledger entryDate,
   * installment due dates, and P&L period. `createdAt` stays untouched as the
   * true audit timestamp of when the record was actually entered.
   */
  saleDate: date("sale_date").notNull().default(sql`CURRENT_DATE`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Invoice lines. Phase 1: vehicles. Phase 2: spare parts reuse this table
 * (vehicleId stays null, description + amount carry the line) — no rework.
 */
export const invoiceItems = pgTable("invoice_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  vehicleId: integer("vehicle_id").references(() => vehicles.id),
  description: varchar("description", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
});

/**
 * Amortization schedule — one row per monthly installment.
 * principal + markup = totalDue. Receivables = sum of unpaid totalDue
 * (+ lateFee) across schedules; balance-due tracking per business rules.
 */
export const installmentSchedules = pgTable("installment_schedules", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  installmentNo: integer("installment_no").notNull(),
  dueDate: date("due_date").notNull(),
  principal: numeric("principal", { precision: 14, scale: 2 }).notNull(),
  markup: numeric("markup", { precision: 14, scale: 2 }).notNull().default("0"),
  totalDue: numeric("total_due", { precision: 14, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  lateFee: numeric("late_fee", { precision: 12, scale: 2 }).notNull().default("0"),
  status: installmentStatus("status").notNull().default("pending"),
  paidAt: timestamp("paid_at"),
});
