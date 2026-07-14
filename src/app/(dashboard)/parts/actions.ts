"use server";

import { revalidatePath } from "next/cache";
import { adjustStock, createPart } from "@/modules/parts/service";
import { gateOrEnqueue } from "@/modules/approvals/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string; queued?: boolean } | null;

export async function addPartAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const actor = { userId: user.id, role: profile.role, branchId: profile.branchId };
  const payload = Object.fromEntries(formData);

  const gate = await gateOrEnqueue(actor, "part.create", payload);
  if (gate.queued) {
    revalidatePath("/approvals");
    return { ok: true, queued: true };
  }

  const result = await createPart(actor, payload);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/parts");
  return { ok: true };
}

export async function adjustStockAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const actor = { userId: user.id, role: profile.role, branchId: profile.branchId };
  const payload = Object.fromEntries(formData);

  const gate = await gateOrEnqueue(actor, "part.adjust", payload);
  if (gate.queued) {
    revalidatePath("/approvals");
    return { ok: true, queued: true };
  }

  const result = await adjustStock(actor, payload);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/parts");
  return { ok: true };
}
