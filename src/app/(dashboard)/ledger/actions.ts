"use server";

import { revalidatePath } from "next/cache";
import { recordEntry } from "@/modules/ledger/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string } | null;

export async function recordEntryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireStaff();

  const result = await recordEntry(
    { userId: user.id, role: profile.role, branchId: profile.branchId },
    Object.fromEntries(formData),
  );

  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/ledger");
  revalidatePath("/dashboard");
  return { ok: true };
}
