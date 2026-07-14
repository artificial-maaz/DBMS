"use server";

import { revalidatePath } from "next/cache";
import { reviewAction } from "@/modules/approvals/service";
import { requireStaff } from "@/lib/session";

export type ReviewState = { ok: boolean; error?: string } | null;

export async function reviewActionAction(
  pendingId: number,
  decision: "approved" | "rejected",
  note?: string,
): Promise<ReviewState> {
  const { user, profile } = await requireStaff();
  const result = await reviewAction(
    { userId: user.id, role: profile.role, branchId: profile.branchId },
    pendingId,
    decision,
    note,
  );
  revalidatePath("/approvals");
  revalidatePath("/", "layout"); // badge counts + affected module pages
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
