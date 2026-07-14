"use server";

import { revalidatePath } from "next/cache";
import { cancelGatePass, issueGatePass, receiveGatePass } from "@/modules/gatepass/service";
import { gateOrEnqueue } from "@/modules/approvals/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string; queued?: boolean } | null;

const actor = async () => {
  const { user, profile } = await requireStaff();
  return { userId: user.id, role: profile.role, branchId: profile.branchId };
};

export async function issuePassAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const a = await actor();
  const payload = Object.fromEntries(formData);
  const gate = await gateOrEnqueue(a, "gatepass.issue", payload);
  if (gate.queued) {
    revalidatePath("/approvals");
    return { ok: true, queued: true };
  }
  const result = await issueGatePass(a, payload);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/gatepass");
  revalidatePath("/inventory");
  return { ok: true };
}

export async function receivePassAction(passId: number): Promise<ActionState> {
  const a = await actor();
  const gate = await gateOrEnqueue(a, "gatepass.receive", { passId });
  if (gate.queued) {
    revalidatePath("/approvals");
    return { ok: true, queued: true };
  }
  const result = await receiveGatePass(a, passId);
  revalidatePath("/gatepass");
  revalidatePath("/inventory");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function cancelPassAction(passId: number): Promise<ActionState> {
  const a = await actor();
  const gate = await gateOrEnqueue(a, "gatepass.cancel", { passId });
  if (gate.queued) {
    revalidatePath("/approvals");
    return { ok: true, queued: true };
  }
  const result = await cancelGatePass(a, passId);
  revalidatePath("/gatepass");
  revalidatePath("/inventory");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
