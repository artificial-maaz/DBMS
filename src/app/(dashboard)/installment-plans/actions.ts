"use server";

import { revalidatePath } from "next/cache";
import { createPlan, setPlanActive, updatePlan } from "@/modules/installment-plans/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string } | null;

export async function addPlanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const result = await createPlan({ userId: user.id, role: profile.role }, Object.fromEntries(formData));
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/installment-plans");
  return { ok: true };
}

export async function updatePlanAction(
  planId: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const result = await updatePlan({ userId: user.id, role: profile.role }, planId, Object.fromEntries(formData));
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/installment-plans");
  return { ok: true };
}

export async function togglePlanAction(planId: number, isActive: boolean) {
  const { user, profile } = await requireStaff();
  const result = await setPlanActive({ userId: user.id, role: profile.role }, planId, isActive);
  revalidatePath("/installment-plans");
  return result;
}
