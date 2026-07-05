"use server";

import { revalidatePath } from "next/cache";
import { createSupplier } from "@/modules/procurement/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string } | null;

export async function addSupplierAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const result = await createSupplier({ userId: user.id, role: profile.role }, Object.fromEntries(formData));
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/suppliers");
  return { ok: true };
}
