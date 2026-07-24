"use server";

import { revalidatePath } from "next/cache";
import { addPartToJob, advanceJob, createJobCard, removePartFromJob } from "@/modules/workshop/service";
import { gateOrEnqueue } from "@/modules/approvals/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string; queued?: boolean } | null;

const actor = async () => {
  const { user, profile } = await requireStaff();
  return { userId: user.id, role: profile.role, branchId: profile.branchId };
};

export async function createJobAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await createJobCard(await actor(), Object.fromEntries(formData));
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/workshop");
  return { ok: true };
}

export async function advanceJobAction(jobId: number, to: string, laborCharge?: string): Promise<ActionState> {
  const a = await actor();

  // "Deliver & Collect" posts cash to the ledger — that's a money action, so
  // staff (incl. BMs) submit it for owner approval like every other money move.
  if (to === "delivered") {
    const gate = await gateOrEnqueue(a, "job.deliver", { jobId, to: "delivered" });
    if (gate.queued) {
      revalidatePath("/approvals");
      return { ok: true, queued: true };
    }
  }

  const result = await advanceJob(a, { jobId, to, laborCharge });
  revalidatePath("/workshop");
  revalidatePath("/ledger");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function addPartAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await addPartToJob(await actor(), {
    jobId: Number(formData.get("jobId")),
    partId: Number(formData.get("partId")),
    qty: Number(formData.get("qty")),
  });
  revalidatePath("/workshop");
  revalidatePath("/parts");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function removePartAction(lineId: number): Promise<ActionState> {
  const result = await removePartFromJob(await actor(), lineId);
  revalidatePath("/workshop");
  revalidatePath("/parts");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
