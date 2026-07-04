import { integer, numeric, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { branches } from "../branches/schema";
import { customers } from "../customers/schema";
import { spareParts } from "../parts/schema";
import { vehicles } from "../inventory/schema";

export const jobStatus = pgEnum("job_status", [
  "open",        // intake done, waiting for mechanic
  "in_progress", // on the bench
  "completed",   // work done, awaiting customer pickup/payment
  "delivered",   // handed over, payment (if any) collected
  "cancelled",
]);

export const warrantyStatus = pgEnum("warranty_status", [
  "free_coupon",     // one of the vehicle's free maintenance visits
  "in_warranty",     // covered repair
  "out_of_warranty", // fully chargeable
]);

/**
 * Job card = one repair visit. vehicleId links to our sold inventory when the
 * bike was bought from us (enables coupon tracking); chassisNo is always
 * captured so outside bikes are serviceable too.
 * Coupon rule: each vehicle sold by us gets FREE_COUPONS_PER_VEHICLE visits
 * (see service.ts); couponNo records which one this job consumed.
 */
export const jobCards = pgTable("job_cards", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  jobNo: varchar("job_no", { length: 30 }).notNull().unique(),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  vehicleId: integer("vehicle_id").references(() => vehicles.id),
  chassisNo: varchar("chassis_no", { length: 50 }).notNull(),
  odometerKm: integer("odometer_km"),
  complaints: text("complaints").notNull(),
  mechanicId: text("mechanic_id"), // auth user id of assigned mechanic
  warrantyStatus: warrantyStatus("warranty_status").notNull().default("out_of_warranty"),
  couponNo: integer("coupon_no"), // set when warrantyStatus = free_coupon
  laborCharge: numeric("labor_charge", { precision: 12, scale: 2 }).notNull().default("0"),
  partsCharge: numeric("parts_charge", { precision: 12, scale: 2 }).notNull().default("0"),
  status: jobStatus("status").notNull().default("open"),
  workNotes: text("work_notes"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  deliveredAt: timestamp("delivered_at"),
});

/** Parts consumed by a job — stock deducted via part_movements (reason: workshop). */
export const jobCardParts = pgTable("job_card_parts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  jobCardId: integer("job_card_id").notNull().references(() => jobCards.id),
  partId: integer("part_id").notNull().references(() => spareParts.id),
  qty: integer("qty").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
});
