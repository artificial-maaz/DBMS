import { integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { branches } from "../branches/schema";
import { vehicles } from "../inventory/schema";

export const gatePassStatus = pgEnum("gate_pass_status", [
  "in_transit", // issued, vehicle on the road
  "received",   // confirmed at destination
  "cancelled",  // recalled before receipt
]);

/**
 * Gate pass = the paper trail for a vehicle moving between branches.
 * Issue: vehicle must be in_stock at source → becomes in_transit.
 * Receive: destination confirms → vehicle re-homed to dest branch, in_stock.
 * Cancel: before receipt → vehicle returns to in_stock at source.
 */
export const gatePasses = pgTable("gate_passes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  passNo: varchar("pass_no", { length: 30 }).notNull().unique(),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id),
  sourceBranchId: integer("source_branch_id").notNull().references(() => branches.id),
  destBranchId: integer("dest_branch_id").notNull().references(() => branches.id),
  driverName: varchar("driver_name", { length: 120 }).notNull(),
  driverPhone: varchar("driver_phone", { length: 20 }),
  transportPlate: varchar("transport_plate", { length: 20 }),
  notes: text("notes"),
  status: gatePassStatus("status").notNull().default("in_transit"),
  issuedBy: text("issued_by").notNull(),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  receivedBy: text("received_by"),
  receivedAt: timestamp("received_at"),
  cancelledBy: text("cancelled_by"),
  cancelledAt: timestamp("cancelled_at"),
});
