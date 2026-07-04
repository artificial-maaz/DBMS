"use server";

import { revalidatePath } from "next/cache";
import { createStaff, setStaffActive } from "@/modules/staff/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string } | null;

export async function addStaffAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const result = await createStaff({ userId: user.id, role: profile.role }, Object.fromEntries(formData));
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/staff");
  return { ok: true };
}

export async function toggleStaffAction(profileId: number, isActive: boolean) {
  const { user, profile } = await requireStaff();
  const result = await setStaffActive({ userId: user.id, role: profile.role }, profileId, isActive);
  revalidatePath("/staff");
  return result;
}
