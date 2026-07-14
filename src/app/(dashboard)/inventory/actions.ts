"use server";

import { revalidatePath } from "next/cache";
import { createVehicle, updateVehicle } from "@/modules/inventory/service";
import { gateOrEnqueue } from "@/modules/approvals/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string; queued?: boolean } | null;

export async function addVehicleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const actor = { userId: user.id, role: profile.role, branchId: profile.branchId };
  const payload = Object.fromEntries(formData);

  const gate = await gateOrEnqueue(actor, "vehicle.create", payload);
  if (gate.queued) {
    revalidatePath("/approvals");
    return { ok: true, queued: true };
  }

  const result = await createVehicle(actor, payload);

  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/inventory");
  return { ok: true };
}

export async function updateVehicleAction(
  vehicleId: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, profile } = await requireStaff();

  const result = await updateVehicle(
    { userId: user.id, role: profile.role, branchId: profile.branchId },
    vehicleId,
    Object.fromEntries(formData),
  );

  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/inventory");
  return { ok: true };
}
