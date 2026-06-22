"use server";

import { revalidatePath } from "next/cache";
import { gateOrEnqueue } from "@/modules/approvals/service";
import { createDelivery } from "@/modules/deliveries/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string; queued?: boolean } | null;

export async function addDeliveryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const actor = { userId: user.id, role: profile.role, branchId: profile.branchId };
  const payload = Object.fromEntries(formData);

  // Stock arriving is a stock action: staff submissions go to the review queue,
  // Creator/Owner execute directly (same rule as every other money/stock action).
  const gate = await gateOrEnqueue(actor, "delivery.create", payload, Number(payload.branchId) || null);
  if (gate.queued) {
    revalidatePath("/deliveries");
    return { ok: true, queued: true };
  }

  const result = await createDelivery(actor, payload);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/deliveries");
  revalidatePath("/inventory");
  return { ok: true };
}
