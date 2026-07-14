import { integer, jsonb, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { branches } from "../branches/schema";

export const approvalStatus = pgEnum("approval_status", ["pending", "approved", "rejected"]);

/**
 * Maker-checker queue (Abrar, approved by Sir 2026-07-14).
 * Staff (everyone below Owner, INCLUDING branch managers) don't execute
 * money/stock actions — they submit them here. An Owner/Creator reviews and
 * approves (the original service runs at that moment, with all its locks and
 * validations, under the ORIGINAL submitter's identity) or rejects with a note.
 * Scope: sales, payments, ledger entries, bookings (+cancel/refund), vehicle
 * & part registrations, stock adjustments, gate passes, stock audits.
 * Customers/visitors/test-drives save instantly (Sir's scoping decision).
 */
export const pendingActions = pgTable("pending_actions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  actionType: varchar("action_type", { length: 60 }).notNull(), // e.g. "sale.create"
  payload: jsonb("payload").notNull(),
  submittedBy: text("submitted_by").notNull(),
  submitterRole: varchar("submitter_role", { length: 30 }).notNull(),
  submitterBranchId: integer("submitter_branch_id"),
  branchId: integer("branch_id").references(() => branches.id),
  status: approvalStatus("status").notNull().default("pending"),
  reviewedBy: text("reviewed_by"),
  reviewNote: text("review_note"),
  lastError: text("last_error"), // approval attempted but the service refused (e.g. bike sold meanwhile)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});
