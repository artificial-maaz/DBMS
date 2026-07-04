"use server";

import { revalidatePath } from "next/cache";
import { advanceJob, createJobCard } from "@/modules/workshop/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string } | null;

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
  const result = await advanceJob(await actor(), { jobId, to, laborCharge });
  revalidatePath("/workshop");
  revalidatePath("/ledger");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
