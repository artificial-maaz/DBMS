import { boolean, date, integer, numeric, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { branches } from "../branches/schema";

/**
 * #22: branch fixed-assets register — furniture, devices, appliances, crockery.
 * Feeds the balance sheet's Fixed Assets line. Retire (isActive=false) instead
 * of delete; retired assets drop off the balance sheet but keep their history.
 */
export const branchAssets = pgTable("branch_assets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  name: varchar("name", { length: 120 }).notNull(), // e.g. "Office desk", "CCTV camera"
  category: varchar("category", { length: 60 }).notNull().default("other"), // furniture/device/appliance/crockery/other
  qty: integer("qty").notNull().default(1),
  unitValue: numeric("unit_value", { precision: 12, scale: 2 }).notNull(),
  purchasedOn: date("purchased_on"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
