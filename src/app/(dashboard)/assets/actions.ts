"use server";

import { revalidatePath } from "next/cache";
import { createAsset, setAssetActive } from "@/modules/assets/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string } | null;

export async function addAssetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const result = await createAsset({ userId: user.id, role: profile.role }, Object.fromEntries(formData));
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/assets");
  return { ok: true };
}

export async function toggleAssetAction(assetId: number, isActive: boolean): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const result = await setAssetActive({ userId: user.id, role: profile.role }, assetId, isActive);
  revalidatePath("/assets");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
