import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { branches } from "../branches/schema";

export const movementReason = pgEnum("part_movement_reason", [
  "initial",    // stock set at part creation
  "restock",    // new stock received
  "sale",       // sold (invoice-linked, Phase 2.1)
  "workshop",   // consumed in a repair (Phase 3)
  "adjustment", // count correction (audit-logged)
]);

/**
 * Quantity-based inventory (vs. serialized vehicles). currentQty lives on the
 * row for fast reads; every change writes an append-only movement row, so the
 * quantity is always reconstructible and auditable.
 * costPrice is RESTRICTED (creator/owner only) like vehicle purchasePrice.
 */
export const spareParts = pgTable("spare_parts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 120 }).notNull(),
  partNo: varchar("part_no", { length: 60 }),
  sku: varchar("sku", { length: 60 }),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  currentQty: integer("current_qty").notNull().default(0),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }), // RESTRICTED
  retailPrice: numeric("retail_price", { precision: 12, scale: 2 }),
  lowStockAt: integer("low_stock_at").notNull().default(2),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const partMovements = pgTable("part_movements", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  partId: integer("part_id").notNull().references(() => spareParts.id),
  delta: integer("delta").notNull(), // +restock / −deduct
  reason: movementReason("reason").notNull(),
  note: text("note"),
  invoiceId: integer("invoice_id"), // linked when reason = sale
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
