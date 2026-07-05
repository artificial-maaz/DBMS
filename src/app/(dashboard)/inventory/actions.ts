"use server";

import { revalidatePath } from "next/cache";
import { createVehicle, updateVehicle } from "@/modules/inventory/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string } | null;

export async function addVehicleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireStaff();

  const result = await createVehicle(
    { userId: user.id, role: profile.role, branchId: profile.branchId },
    Object.fromEntries(formData),
  );

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
