import { boolean, integer, numeric, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * #26: the company's standard service/repair price list. Same manageable-list
 * pattern as installment plans and document requirements: retire, never delete
 * — completed jobs keep the price they were charged regardless of later edits
 * (labor charge is snapshotted onto the job card, not referenced).
 */
export const laborRates = pgTable("labor_rates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  serviceName: varchar("service_name", { length: 150 }).notNull().unique(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  equipment: varchar("equipment", { length: 150 }), // e.g. "torque wrench, lift"
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
