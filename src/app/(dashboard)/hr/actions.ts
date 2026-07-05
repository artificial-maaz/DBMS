"use server";

import { revalidatePath } from "next/cache";
import { runPayroll } from "@/modules/hr/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string } | null;

export async function runPayrollAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const result = await runPayroll(
    { userId: user.id, role: profile.role },
    Object.fromEntries(formData),
  );
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/hr");
  revalidatePath("/ledger");
  return { ok: true };
}
