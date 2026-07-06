"use server";

import { revalidatePath } from "next/cache";
import { createRequirement, setRequirementActive, updateRequirement } from "@/modules/document-requirements/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string } | null;

export async function addRequirementAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const result = await createRequirement({ userId: user.id, role: profile.role }, Object.fromEntries(formData));
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/document-requirements");
  return { ok: true };
}

export async function updateRequirementAction(
  requirementId: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const result = await updateRequirement({ userId: user.id, role: profile.role }, requirementId, Object.fromEntries(formData));
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/document-requirements");
  return { ok: true };
}

export async function toggleRequirementAction(requirementId: number, isActive: boolean) {
  const { user, profile } = await requireStaff();
  const result = await setRequirementActive({ userId: user.id, role: profile.role }, requirementId, isActive);
  revalidatePath("/document-requirements");
  return result;
}
