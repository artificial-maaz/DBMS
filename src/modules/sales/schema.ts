import { sql } from "drizzle-orm";
import {
  boolean,
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
import { documentRequirements } from "../document-requirements/schema";
import { handoverRequirements } from "../handover-requirements/schema";
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
  /** Sir 2026-07-14: warranty card photo must be sent to the company at sale
   * time to start the warranty clock — BMs forget, so it's tracked + reviewed. */
  warrantyCardSent: boolean("warranty_card_sent").notNull().default(false),
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
 * Guarantor(s) vouching for an installment sale (#21, 2026-07-06). One-to-many:
 * some high-value bikes need two guarantors, most need one. Captured at sale
 * creation, required for installment plans; not editable after (matches the
 * paperwork — a guarantor change is effectively a new agreement, not a typo fix).
 */
export const guarantors = pgTable("guarantors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  fullName: varchar("full_name", { length: 120 }).notNull(),
  cnic: varchar("cnic", { length: 15 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Per-invoice checklist snapshot (#20, 2026-07-06) — installment sales only.
 * requirementName is snapshotted at sale time so renaming/retiring a
 * requirement later never rewrites history. Not a hard gate: `provided=false`
 * rows can carry a compensation note/amount instead of blocking the sale
 * (Sir's explicit call — informational tracking, not validation).
 */
/**
 * Abrar #2 (2026-07-14): document CUSTODY — where each paper physically is.
 *   given_to_customer  — handed over
 *   held_by_dealer     — we keep it (e.g. registration service in progress)
 *   pending            — not yet received from customer/authority
 * Changeable AFTER the sale (papers move); every change audit-logged.
 */
export const documentCustody = pgEnum("document_custody", [
  "given_to_customer",
  "held_by_dealer",
  "pending",
]);

export const invoiceDocuments = pgTable("invoice_documents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  requirementId: integer("requirement_id").notNull().references(() => documentRequirements.id),
  requirementName: varchar("requirement_name", { length: 120 }).notNull(),
  provided: boolean("provided").notNull().default(true),
  custody: documentCustody("custody").notNull().default("pending"),
  compensationAmount: numeric("compensation_amount", { precision: 12, scale: 2 }),
  compensationNote: text("compensation_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * #13 (Sir, 2026-08-09) — what physically went out with the bike, per sale.
 * Applies to CASH sales as well as installment: mirrors and a charger are owed
 * to every buyer, however they paid.
 *
 * `requirementName` is snapshotted at sale time (same reason as
 * `invoice_documents`): retiring or renaming an item later must never rewrite
 * what a past invoice says was handed over. Not a hard gate — an unticked item
 * records a note ("mirrors on order, collect Friday") rather than blocking the
 * sale, matching how the document checklist behaves.
 */
export const invoiceHandovers = pgTable("invoice_handovers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  requirementId: integer("requirement_id").notNull().references(() => handoverRequirements.id),
  requirementName: varchar("requirement_name", { length: 120 }).notNull(),
  handedOver: boolean("handed_over").notNull().default(true),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
