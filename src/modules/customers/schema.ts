import { integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { branches } from "../branches/schema";

/**
 * Customer registry. CNIC is the national identity anchor (global search key,
 * alongside phone). Not unique at DB level: family members may share phones,
 * and CNIC can be absent on walk-ins — dedupe is a service-layer concern.
 */
export const customers = pgTable("customers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  fullName: varchar("full_name", { length: 120 }).notNull(),
  cnic: varchar("cnic", { length: 15 }), // 42201-1234567-1
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 120 }),
  address: text("address"),
  city: varchar("city", { length: 60 }),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  createdBy: text("created_by").notNull(), // auth user id
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
