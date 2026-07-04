"use server";

import { revalidatePath } from "next/cache";
import { adjustStock, createPart } from "@/modules/parts/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string } | null;

export async function addPartAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const result = await createPart(
    { userId: user.id, role: profile.role, branchId: profile.branchId },
    Object.fromEntries(formData),
  );
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/parts");
  return { ok: true };
}

export async function adjustStockAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const result = await adjustStock(
    { userId: user.id, role: profile.role, branchId: profile.branchId },
    Object.fromEntries(formData),
  );
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/parts");
  return { ok: true };
}
