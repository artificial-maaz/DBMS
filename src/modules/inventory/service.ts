import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { canCreateVehicle, canSeePurchasePrice, seesAllBranches } from "./permissions";
import { createVehicleSchema } from "./validators";

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
