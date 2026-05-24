"use server";

import { revalidatePath } from "next/cache";
import { createSupplier, setSupplierActive, updateSupplier } from "@/modules/procurement/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string } | null;

const actor = async () => {
  const { user, profile } = await requireStaff();
  return { userId: user.id, role: profile.role };
};

export async function addSupplierAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await createSupplier(await actor(), Object.fromEntries(formData));
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/suppliers");
  return { ok: true };
}

export async function updateSupplierAction(
  supplierId: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = await updateSupplier(await actor(), supplierId, Object.fromEntries(formData));
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/suppliers");
  revalidatePath("/purchases");
  return { ok: true };
}

export async function toggleSupplierAction(supplierId: number, isActive: boolean): Promise<ActionState> {
  const result = await setSupplierActive(await actor(), supplierId, isActive);
  revalidatePath("/suppliers");
  revalidatePath("/purchases");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
