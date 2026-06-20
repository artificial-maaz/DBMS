import { date, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { branches } from "../branches/schema";
import { suppliers } from "../procurement/schema";

/**
 * Stock Deliveries (Sir #4, 2026-07-31) — the arrival record for inbound stock.
 *
 * A delivery is one physical consignment from a company/supplier into one
 * branch on one date. Vehicles registered through a delivery carry its id,
 * which is what finally answers "which vehicle came when, and sold when" and
 * groups units into batches.
 *
 * Deliberately independent of purchase orders: many arrivals happen without a
 * formal PO in Sir's business, so `purchaseOrderId` is optional and only links
 * the two when a PO does exist.
 */
export const stockDeliveries = pgTable("stock_deliveries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  deliveryNo: varchar("delivery_no", { length: 30 }).notNull().unique(),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  /** Company name as written on the challan when the supplier isn't in our list yet. */
  companyName: varchar("company_name", { length: 120 }),
  /** Supplier's own challan / invoice / batch reference from the paperwork. */
  challanNo: varchar("challan_no", { length: 60 }),
  batchRef: varchar("batch_ref", { length: 60 }),
  deliveredOn: date("delivered_on").notNull(),
  transportPlate: varchar("transport_plate", { length: 20 }),
  driverName: varchar("driver_name", { length: 120 }),
  notes: text("notes"),
  receivedBy: text("received_by").notNull(), // auth user id
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
