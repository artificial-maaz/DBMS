import { and, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { branches, stockDeliveries, vehicles } from "@/db/schema";
import { canSeePurchasePrice, seesAllBranches } from "./permissions";

export type VehicleRow = {
  id: number;
  make: string;
  model: string;
  variant: string | null;
  color: string | null;
  chassisNo: string;
  engineNo: string;
  status: "in_stock" | "sold" | "in_transit" | "in_repair";
  salePrice: string | null;
  purchasePrice?: string | null; // present ONLY for creator/owner
  notes: string | null;
  branchId: number;
  branchName: string;
  createdAt: Date;
  /** Sir #4 (2026-07-31): when the unit physically arrived, and in which batch. */
  arrivedOn: string | null;
  deliveryId: number | null;
  deliveryNo: string | null;
};

/**
 * RBAC happens here, not in the UI:
 * - non-owners are hard-scoped to their own branch (WHERE clause)
 * - purchasePrice is only SELECTed for creator/owner — for everyone else the
 *   field never exists in the result, so it can never leak to the client.
 */
export async function listVehicles(opts: {
  role: string;
  ownBranchId: number | null;
  status?: string;
  branchId?: number;
}): Promise<VehicleRow[]> {
  const showPrice = canSeePurchasePrice(opts.role);
  const allBranches = seesAllBranches(opts.role);

  const filters: SQL[] = [];
  if (!allBranches) {
    if (!opts.ownBranchId) return []; // unscoped employee: nothing
    filters.push(eq(vehicles.branchId, opts.ownBranchId));
  } else if (opts.branchId) {
    filters.push(eq(vehicles.branchId, opts.branchId));
  }
  if (opts.status) filters.push(eq(vehicles.status, opts.status as VehicleRow["status"]));

  const rows = await db
    .select({
      id: vehicles.id,
      make: vehicles.make,
      model: vehicles.model,
      variant: vehicles.variant,
      color: vehicles.color,
      chassisNo: vehicles.chassisNo,
      engineNo: vehicles.engineNo,
      status: vehicles.status,
      salePrice: vehicles.salePrice,
      ...(showPrice ? { purchasePrice: vehicles.purchasePrice } : {}),
      notes: vehicles.notes,
      branchId: vehicles.branchId,
      branchName: branches.name,
      createdAt: vehicles.createdAt,
      arrivedOn: vehicles.arrivedOn,
      deliveryId: vehicles.deliveryId,
      deliveryNo: stockDeliveries.deliveryNo,
    })
    .from(vehicles)
    .innerJoin(branches, eq(vehicles.branchId, branches.id))
    // Left join: units registered manually (or before the Deliveries module)
    // simply have no batch, and must still appear in the list.
    .leftJoin(stockDeliveries, eq(vehicles.deliveryId, stockDeliveries.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(vehicles.createdAt));

  return rows as VehicleRow[];
}

export async function listActiveBranches() {
  return db.query.branches.findMany({
    where: (b, { eq }) => eq(b.isActive, true),
    orderBy: (b, { asc }) => asc(b.name),
  });
}
