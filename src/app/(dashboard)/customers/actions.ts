"use server";

import { revalidatePath } from "next/cache";
import { createCustomer, updateCustomer } from "@/modules/customers/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string } | null;

export async function addCustomerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireStaff();

  const result = await createCustomer(
    { userId: user.id, role: profile.role, branchId: profile.branchId },
    Object.fromEntries(formData),
  );

  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/customers");
  return { ok: true };
}

export async function updateCustomerAction(
  customerId: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, profile } = await requireStaff();

  const result = await updateCustomer(
    { userId: user.id, role: profile.role, branchId: profile.branchId },
    customerId,
    Object.fromEntries(formData),
  );

  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/customers");
  return { ok: true };
}
