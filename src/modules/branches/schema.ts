import { boolean, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Branches — the multi-branch spine of the ERP.
 * Every operational record in every module carries a branchId.
 */
export const branches = pgTable("branches", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  city: varchar("city", { length: 60 }).notNull(),
  address: varchar("address", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
