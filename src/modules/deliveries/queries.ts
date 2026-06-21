import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { branches, invoiceItems, invoices, stockDeliveries, suppliers, user, vehicles } from "@/db/schema";
import { canSeeUnitCost, seesAllBranches } from "./permissions";

/** Batch list with received/sold counts per consignment. */
export async function listDeliveries(opts: { role: string; ownBranchId: number | null; branchId?: number }) {
  const filters: SQL[] = [];
  if (!seesAllBranches(opts.role)) {
    if (!opts.ownBranchId) return [];
    filters.push(eq(stockDeliveries.branchId, opts.ownBranchId));
  } else if (opts.branchId) {
    filters.push(eq(stockDeliveries.branchId, opts.branchId));
  }

  return db
    .select({
      id: stockDeliveries.id,
      deliveryNo: stockDeliveries.deliveryNo,
      deliveredOn: stockDeliveries.deliveredOn,
      challanNo: stockDeliveries.challanNo,
      batchRef: stockDeliveries.batchRef,
      branchName: branches.name,
      supplierName: sql<string>`coalesce(${suppliers.name}, ${stockDeliveries.companyName}, '-')`,
      receivedByName: user.name,
      units: sql<number>`(select count(*) from ${vehicles} v where v.delivery_id = ${stockDeliveries.id})::int`,
      soldUnits: sql<number>`(select count(*) from ${vehicles} v where v.delivery_id = ${stockDeliveries.id} and v.status = 'sold')::int`,
    })
    .from(stockDeliveries)
    .innerJoin(branches, eq(stockDeliveries.branchId, branches.id))
    .leftJoin(suppliers, eq(stockDeliveries.supplierId, suppliers.id))
    .leftJoin(user, eq(stockDeliveries.receivedBy, user.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(stockDeliveries.deliveredOn), desc(stockDeliveries.id));
}

/**
 * One consignment with its units — each showing arrival date and, if sold, the
 * invoice + sale date. This is the "came when / sold when" view (Sir #4).
 * The sale side is read back by joining invoices, so nothing is written twice.
 */
export async function getDeliveryDetail(opts: { id: number; role: string; ownBranchId: number | null }) {
  const delivery = await db.query.stockDeliveries.findFirst({
    where: (d, { eq }) => eq(d.id, opts.id),
  });
  if (!delivery) return null;
  if (!seesAllBranches(opts.role) && delivery.branchId !== opts.ownBranchId) return null;

  const [branch, supplier, receiver, units] = await Promise.all([
    db.query.branches.findFirst({ where: (b, { eq }) => eq(b.id, delivery.branchId) }),
    delivery.supplierId
      ? db.query.suppliers.findFirst({ where: (s, { eq }) => eq(s.id, delivery.supplierId!) })
      : null,
    db.query.user.findFirst({ where: (u, { eq }) => eq(u.id, delivery.receivedBy) }),
    db
      .select({
        id: vehicles.id,
        make: vehicles.make,
        model: vehicles.model,
        variant: vehicles.variant,
        color: vehicles.color,
        chassisNo: vehicles.chassisNo,
        engineNo: vehicles.engineNo,
        status: vehicles.status,
        branchId: vehicles.branchId,
        arrivedOn: vehicles.arrivedOn,
        purchasePrice: vehicles.purchasePrice,
        salePrice: vehicles.salePrice,
        invoiceNo: invoices.invoiceNo,
        saleDate: invoices.saleDate,
        invoiceId: invoices.id,
      })
      .from(vehicles)
      .leftJoin(invoiceItems, eq(invoiceItems.vehicleId, vehicles.id))
      .leftJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(eq(vehicles.deliveryId, opts.id))
      .orderBy(vehicles.chassisNo),
  ]);

  const showCost = canSeeUnitCost(opts.role);
  return {
    delivery,
    branch,
    supplier,
    receiverName: receiver?.name ?? null,
    units: units.map((u) => ({ ...u, purchasePrice: showCost ? u.purchasePrice : null })),
  };
}
