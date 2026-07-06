import { date, integer, numeric, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { branches } from "../branches/schema";
import { customers } from "../customers/schema";

export const visitorSource = pgEnum("visitor_source", ["walk_in", "event", "referral", "online"]);

export const visitorStatus = pgEnum("visitor_status", [
  "new",
  "contacted",
  "follow_up",
  "converted",
  "lost",
]);

/**
 * #4 (2026-07-06): window-shoppers / event-stall interest — deliberately a
 * SEPARATE table from `customers`, not a flag on it. Keeps the customer
 * registry meaning "people who actually bought," keeps global search/counts/
 * dashboards clean, and gives #9 (WhatsApp follow-ups) a table to target that
 * never touches real customer data.
 */
export const visitors = pgTable("visitors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  fullName: varchar("full_name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  cnic: varchar("cnic", { length: 15 }),
  interest: varchar("interest", { length: 200 }), // e.g. "Yadea G5 Pro, black"
  budget: numeric("budget", { precision: 12, scale: 2 }),
  source: visitorSource("source").notNull().default("walk_in"),
  status: visitorStatus("status").notNull().default("new"),
  notes: text("notes"),
  followUpDate: date("follow_up_date"),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  // Set once convertVisitorToCustomer() runs — the audit trail from lead to buyer.
  convertedCustomerId: integer("converted_customer_id").references(() => customers.id),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
