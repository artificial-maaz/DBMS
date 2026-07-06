"use server";

import { revalidatePath } from "next/cache";
import { convertVisitorToCustomer, createVisitor, updateVisitor } from "@/modules/visitors/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string } | null;
export type ConvertState = { ok: boolean; error?: string; customerId?: number } | null;

export async function addVisitorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const result = await createVisitor(
    { userId: user.id, role: profile.role, branchId: profile.branchId },
    Object.fromEntries(formData),
  );
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/customers/visitors");
  return { ok: true };
}

export async function updateVisitorAction(
  visitorId: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const result = await updateVisitor(
    { userId: user.id, role: profile.role, branchId: profile.branchId },
    visitorId,
    Object.fromEntries(formData),
  );
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/customers/visitors");
  return { ok: true };
}

export async function convertVisitorAction(visitorId: number): Promise<ConvertState> {
  const { user, profile } = await requireStaff();
  const result = await convertVisitorToCustomer(
    { userId: user.id, role: profile.role, branchId: profile.branchId },
    visitorId,
  );
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/customers/visitors");
  revalidatePath("/customers");
  return { ok: true, customerId: result.customerId };
}
