import { integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { branches } from "../branches/schema";
import { customers } from "../customers/schema";
import { vehicles } from "../inventory/schema";
import { visitors } from "../visitors/schema";

export const testDriveStatus = pgEnum("test_drive_status", [
  "scheduled",
  "completed",
  "no_show",
  "cancelled",
]);

/**
 * Test drive log + bookings (#17). Rider can be a customer, a visitor/lead,
 * or a pure walk-in (both links null) — personName/phone are always snapshotted
 * so the record survives conversions and edits.
 * BUSINESS RULE: all branches are closed on FRIDAYS — no scheduling on Fridays
 * (enforced in service.ts, mirrored client-side).
 */
export const testDrives = pgTable("test_drives", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id").references(() => customers.id),
  visitorId: integer("visitor_id").references(() => visitors.id),
  personName: varchar("person_name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id), // in-stock unit used
  vehicleText: varchar("vehicle_text", { length: 120 }),          // or free-text model of interest
  branchId: integer("branch_id").notNull().references(() => branches.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: testDriveStatus("status").notNull().default("scheduled"),
  notes: text("notes"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
