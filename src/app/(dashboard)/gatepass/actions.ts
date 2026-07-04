"use server";

import { revalidatePath } from "next/cache";
import { cancelGatePass, issueGatePass, receiveGatePass } from "@/modules/gatepass/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string } | null;

const actor = async () => {
  const { user, profile } = await requireStaff();
  return { userId: user.id, role: profile.role, branchId: profile.branchId };
};

export async function issuePassAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await issueGatePass(await actor(), Object.fromEntries(formData));
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/gatepass");
  revalidatePath("/inventory");
  return { ok: true };
}

export async function receivePassAction(passId: number): Promise<ActionState> {
  const result = await receiveGatePass(await actor(), passId);
  revalidatePath("/gatepass");
  revalidatePath("/inventory");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function cancelPassAction(passId: number): Promise<ActionState> {
  const result = await cancelGatePass(await actor(), passId);
  revalidatePath("/gatepass");
  revalidatePath("/inventory");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
