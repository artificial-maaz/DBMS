import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { branches } from "../branches/schema";

export const vehicleStatus = pgEnum("vehicle_status", [
  "in_stock",
  "sold",
  "in_transit", // gate pass (Phase 2) moves vehicles through this
  "in_repair",  // workshop (Phase 3)
]);

/**
 * Serialized vehicle inventory — one row per physical unit.
 * RBAC rule: purchasePrice is Creator/Owner-only. Employee-facing queries
 * must NEVER select it (enforced in inventory/permissions.ts + queries.ts).
 */
export const vehicles = pgTable("vehicles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  chassisNo: varchar("chassis_no", { length: 50 }).notNull().unique(),
  engineNo: varchar("engine_no", { length: 50 }).notNull().unique(),
  make: varchar("make", { length: 60 }).notNull(),           // e.g. Yadea, Evee
  model: varchar("model", { length: 100 }).notNull(),
  variant: varchar("variant", { length: 100 }),              // battery/wattage etc.
  color: varchar("color", { length: 40 }),
  purchasePrice: numeric("purchase_price", { precision: 14, scale: 2 }), // RESTRICTED
  salePrice: numeric("sale_price", { precision: 14, scale: 2 }),
  status: vehicleStatus("status").notNull().default("in_stock"),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  notes: text("notes"),
  createdBy: text("created_by").notNull(), // auth user id
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
