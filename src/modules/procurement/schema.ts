import { boolean, date, integer, numeric, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { branches } from "../branches/schema";

export const suppliers = pgTable("suppliers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  contactPerson: varchar("contact_person", { length: 120 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 120 }),
  city: varchar("city", { length: 60 }),
  ntn: varchar("ntn", { length: 30 }),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Stock purchase = money owed/paid to a supplier for inbound stock.
 * Payments post to the ledger as cash_out 'purchase' (excluded from P&L
 * expenses — inventory is an asset; it hits P&L as COGS when sold).
 */
export const purchaseOrders = pgTable("purchase_orders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  poNo: varchar("po_no", { length: 30 }).notNull().unique(),
  supplierId: integer("supplier_id").notNull().references(() => suppliers.id),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  description: text("description").notNull(), // e.g. "10x Yadea G5, 5x battery packs"
  totalCost: numeric("total_cost", { precision: 14, scale: 2 }).notNull(),
  amountPaid: numeric("amount_paid", { precision: 14, scale: 2 }).notNull().default("0"),
  purchaseDate: date("purchase_date").notNull(),
  notes: text("notes"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
