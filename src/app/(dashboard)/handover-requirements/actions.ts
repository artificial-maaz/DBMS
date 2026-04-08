"use server";

import { revalidatePath } from "next/cache";
import {
  createHandoverItem,
  setHandoverItemActive,
  updateHandoverItem,
} from "@/modules/handover-requirements/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string } | null;

export async function addHandoverItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const result = await createHandoverItem({ userId: user.id, role: profile.role }, Object.fromEntries(formData));
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/handover-requirements");
  return { ok: true };
}

export async function updateHandoverItemAction(
  itemId: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const result = await updateHandoverItem({ userId: user.id, role: profile.role }, itemId, Object.fromEntries(formData));
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/handover-requirements");
  return { ok: true };
}

export async function toggleHandoverItemAction(itemId: number, isActive: boolean) {
  const { user, profile } = await requireStaff();
  const result = await setHandoverItemActive({ userId: user.id, role: profile.role }, itemId, isActive);
  revalidatePath("/handover-requirements");
  return result;
}
