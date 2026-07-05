import { eq } from "drizzle-orm";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { canCreateVehicle, canEditVehicle, canSeePurchasePrice, seesAllBranches } from "./permissions";
import { createVehicleSchema, updateVehicleSchema } from "./validators";

type Actor = { userId: string; role: string; branchId: number | null };

export async function createVehicle(actor: Actor, raw: unknown) {
  if (!canCreateVehicle(actor.role)) {
    return { ok: false as const, error: "You are not allowed to register vehicles." };
  }

  const parsed = createVehicleSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  // Branch managers can only register into their own branch.
  if (!seesAllBranches(actor.role) && input.branchId !== actor.branchId) {
    return { ok: false as const, error: "You can only register vehicles in your own branch." };
  }

  // Employees cannot set purchase price even if they craft the request by hand.
  const purchasePrice =
    canSeePurchasePrice(actor.role) && input.purchasePrice ? input.purchasePrice : null;

  try {
    const [row] = await db
      .insert(vehicles)
      .values({
        make: input.make,
        model: input.model,
        variant: input.variant || null,
        color: input.color || null,
        chassisNo: input.chassisNo,
        engineNo: input.engineNo,
        purchasePrice,
        salePrice: input.salePrice || null,
        branchId: input.branchId,
        notes: input.notes || null,
        createdBy: actor.userId,
      })
      .returning({ id: vehicles.id });

    await writeAudit({
      userId: actor.userId,
      action: "vehicle.create",
      entity: "vehicle",
      entityId: row.id,
      branchId: input.branchId,
      details: { chassisNo: input.chassisNo, make: input.make, model: input.model },
    });

    return { ok: true as const, id: row.id };
  } catch (e: unknown) {
    const msg = e instanceof Error && e.message.includes("duplicate")
      ? "A vehicle with this chassis or engine number already exists."
      : "Failed to save vehicle.";
    return { ok: false as const, error: msg };
  }
}

/**
 * #3 (2026-07-06): edit vehicle specs. Branch reassignment is deliberately
 * excluded — that flows through Gate Pass so the transfer trail stays intact.
 * Blocked once "sold": the invoice line already snapshots the description, and
 * P&L keys off the sale-time values, so post-sale edits would just be misleading.
 */
export async function updateVehicle(actor: Actor, vehicleId: number, raw: unknown) {
  if (!canEditVehicle(actor.role)) {
    return { ok: false as const, error: "You are not allowed to edit vehicles." };
  }

  const parsed = updateVehicleSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  const existing = await db.query.vehicles.findFirst({ where: (v, { eq }) => eq(v.id, vehicleId) });
  if (!existing) return { ok: false as const, error: "Vehicle not found." };
  if (!seesAllBranches(actor.role) && existing.branchId !== actor.branchId) {
    return { ok: false as const, error: "You can only edit vehicles in your own branch." };
  }
  if (existing.status === "sold") {
    return { ok: false as const, error: "This vehicle is already sold — details are locked." };
  }

  const purchasePrice = canSeePurchasePrice(actor.role) ? (input.purchasePrice || null) : existing.purchasePrice;

  try {
    await db
      .update(vehicles)
      .set({
        make: input.make,
        model: input.model,
        variant: input.variant || null,
        color: input.color || null,
        chassisNo: input.chassisNo,
        engineNo: input.engineNo,
        purchasePrice,
        salePrice: input.salePrice || null,
        notes: input.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(vehicles.id, vehicleId));

    await writeAudit({
      userId: actor.userId,
      action: "vehicle.update",
      entity: "vehicle",
      entityId: vehicleId,
      branchId: existing.branchId,
      details: { chassisNo: input.chassisNo, make: input.make, model: input.model },
    });

    return { ok: true as const };
  } catch (e: unknown) {
    const msg = e instanceof Error && e.message.includes("duplicate")
      ? "A vehicle with this chassis or engine number already exists."
      : "Failed to update vehicle.";
    return { ok: false as const, error: msg };
  }
}
