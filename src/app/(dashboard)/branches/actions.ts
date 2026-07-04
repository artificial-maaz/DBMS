"use server";

import { revalidatePath } from "next/cache";
import { createBranch, setBranchActive } from "@/modules/branches/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string } | null;

export async function addBranchAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const result = await createBranch({ userId: user.id, role: profile.role }, Object.fromEntries(formData));
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/branches");
  return { ok: true };
}

export async function toggleBranchAction(branchId: number, isActive: boolean) {
  const { user, profile } = await requireStaff();
  await setBranchActive({ userId: user.id, role: profile.role }, branchId, isActive);
  revalidatePath("/branches");
}
