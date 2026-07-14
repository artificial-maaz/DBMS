"use server";

import { revalidatePath } from "next/cache";
import { recordEntry } from "@/modules/ledger/service";
import { gateOrEnqueue } from "@/modules/approvals/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string; queued?: boolean } | null;

export async function recordEntryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const actor = { userId: user.id, role: profile.role, branchId: profile.branchId };
  const payload = Object.fromEntries(formData);

  const gate = await gateOrEnqueue(actor, "ledger.record", payload);
  if (gate.queued) {
    revalidatePath("/approvals");
    return { ok: true, queued: true };
  }

  const result = await recordEntry(actor, payload);

  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/ledger");
  revalidatePath("/dashboard");
  return { ok: true };
}
