import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { branches, purchaseOrderItems, purchaseOrders, suppliers } from "@/db/schema";

/**
 * Read side of procurement, extracted from service.ts (2026-08-09) so the
 * module matches the convention every other domain follows. Queries moved
 * verbatim — no behaviour changed with them.
 */

/**
 * Every supplier, retired included. The Purchases page filters this one list
 * two ways — active-only for the New Purchase dropdown, all of them for the
 * edit form, since a PO placed with a since-retired supplier must still be able
 * to show and keep its own supplier.
 */
export const listSuppliers = () => db.select().from(suppliers).orderBy(suppliers.name);

export function listPurchases() {
  return db
    .select({
      id: purchaseOrders.id,
      poNo: purchaseOrders.poNo,
      supplierId: purchaseOrders.supplierId,
      supplierName: suppliers.name,
      branchName: branches.name,
      description: purchaseOrders.description,
      totalCost: purchaseOrders.totalCost,
      amountPaid: purchaseOrders.amountPaid,
      purchaseDate: purchaseOrders.purchaseDate,
      notes: purchaseOrders.notes,
    })
    .from(purchaseOrders)
    .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .innerJoin(branches, eq(purchaseOrders.branchId, branches.id))
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(100);
}

/** All lines for a set of POs (page groups them client-side). */
export async function listPurchaseItems(poIds: number[]) {
  if (poIds.length === 0) return [];
  return db.select().from(purchaseOrderItems).where(inArray(purchaseOrderItems.poId, poIds));
}

/** #15: ordering patterns — what you buy, how often, how much of it arrives. */
export async function orderPatterns() {
  return db
    .select({
      model: purchaseOrderItems.model,
      timesOrdered: sql<number>`count(distinct ${purchaseOrderItems.poId})::int`,
      totalOrdered: sql<number>`sum(${purchaseOrderItems.qtyOrdered})::int`,
      totalReceived: sql<number>`sum(${purchaseOrderItems.qtyReceived})::int`,
      totalSpent: sql<string>`sum(${purchaseOrderItems.qtyOrdered} * ${purchaseOrderItems.unitCost})`,
      lastOrdered: sql<string>`max(${purchaseOrders.purchaseDate})`,
    })
    .from(purchaseOrderItems)
    .innerJoin(purchaseOrders, eq(purchaseOrderItems.poId, purchaseOrders.id))
    .groupBy(purchaseOrderItems.model)
    .orderBy(sql`sum(${purchaseOrderItems.qtyOrdered}) desc`);
}
