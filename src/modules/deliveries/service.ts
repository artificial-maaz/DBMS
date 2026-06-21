import { sql } from "drizzle-orm";
import { db } from "@/db";
import { stockDeliveries, vehicles } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { canRecordDelivery, canSeeUnitCost } from "./permissions";
import { createDeliverySchema } from "./validators";

type Actor = { userId: string; role: string; branchId: number | null };

/**
 * Stock Deliveries (Sir #4, 2026-07-31).
 *
 * Records an inbound consignment and registers its units into inventory in one
 * atomic step, stamping each vehicle with the delivery id + arrival date. That
 * single link is what finally makes "which vehicle came when, and sold when"
 * answerable, and groups units into batches.
 *
 * Deliberately independent of purchase orders: many arrivals happen without a
 * formal PO in Sir's business, so a supplier link is optional and a free-text
 * company name is accepted instead.
 */
async function nextDeliveryNo(tx: typeof db, year: number) {
  const [{ n }] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(stockDeliveries)
    .where(sql`extract(year from ${stockDeliveries.deliveredOn}) = ${year}`);
  return `DEL-${year}-${String(n + 1).padStart(4, "0")}`;
}

export async function createDelivery(actor: Actor, raw: unknown) {
  if (!canRecordDelivery(actor.role)) {
    return { ok: false as const, error: "You are not allowed to record deliveries." };
  }
  const parsed = createDeliverySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  if (!input.supplierId && !input.companyName) {
    return { ok: false as const, error: "Pick a supplier or type the company name." };
  }

  // Duplicate chassis inside the same submission — caught before touching the DB
  // so the error names the offender instead of a raw constraint violation.
  const seen = new Set<string>();
  for (const v of input.vehicles) {
    const key = v.chassisNo.toUpperCase();
    if (seen.has(key)) {
      return { ok: false as const, error: `Chassis ${v.chassisNo} appears twice in this delivery.` };
    }
    seen.add(key);
  }

  // Purchase price is management-only data — stripped server-side regardless of
  // what the form sent (same rule as manual vehicle registration).
  const keepCost = canSeeUnitCost(actor.role);

  try {
    const result = await db.transaction(async (tx) => {
      const year = new Date(input.deliveredOn).getFullYear();
      const deliveryNo = await nextDeliveryNo(tx as unknown as typeof db, year);

      const [delivery] = await tx
        .insert(stockDeliveries)
        .values({
          deliveryNo,
          branchId: input.branchId,
          supplierId: input.supplierId ?? null,
          companyName: input.companyName || null,
          challanNo: input.challanNo || null,
          batchRef: input.batchRef || null,
          deliveredOn: input.deliveredOn,
          transportPlate: input.transportPlate || null,
          driverName: input.driverName || null,
          notes: input.notes || null,
          receivedBy: actor.userId,
        })
        .returning({ id: stockDeliveries.id });

      // All-or-nothing: one bad chassis rolls the whole consignment back, so a
      // delivery is never half-registered.
      await tx.insert(vehicles).values(
        input.vehicles.map((v) => ({
          make: v.make,
          model: v.model,
          variant: v.variant || null,
          color: v.color || null,
          chassisNo: v.chassisNo,
          engineNo: v.engineNo,
          purchasePrice: keepCost && v.purchasePrice ? v.purchasePrice : null,
          salePrice: v.salePrice || null,
          branchId: input.branchId,
          deliveryId: delivery.id,
          arrivedOn: input.deliveredOn,
          createdBy: actor.userId,
        })),
      );

      return { id: delivery.id, deliveryNo };
    });

    await writeAudit({
      userId: actor.userId,
      action: "delivery.create",
      entity: "stock_delivery",
      entityId: result.id,
      branchId: input.branchId,
      details: {
        deliveryNo: result.deliveryNo,
        units: input.vehicles.length,
        challanNo: input.challanNo || null,
        chassisNos: input.vehicles.map((v) => v.chassisNo),
      },
    });

    return { ok: true as const, id: result.id, deliveryNo: result.deliveryNo };
  } catch (e: unknown) {
    const dup = e instanceof Error && e.message.includes("duplicate");
    return {
      ok: false as const,
      error: dup
        ? "One of these chassis/engine numbers is already registered — nothing was saved."
        : "Failed to record delivery.",
    };
  }
}
