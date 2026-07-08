"use server";

import { revalidatePath } from "next/cache";
import { createRate, setRateActive, updateRate } from "@/modules/labor-rates/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string } | null;

const actor = async () => {
  const { user, profile } = await requireStaff();
  return { userId: user.id, role: profile.role };
};

export async function addRateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await createRate(await actor(), Object.fromEntries(formData));
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/labor-rates");
  return { ok: true };
}

export async function updateRateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const rateId = Number(formData.get("rateId"));
  const result = await updateRate(await actor(), rateId, Object.fromEntries(formData));
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/labor-rates");
  return { ok: true };
}

export async function toggleRateAction(rateId: number, isActive: boolean): Promise<ActionState> {
  const result = await setRateActive(await actor(), rateId, isActive);
  revalidatePath("/labor-rates");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
