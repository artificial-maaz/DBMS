"use server";

import { revalidatePath } from "next/cache";
import { payPurchase, recordPurchase } from "@/modules/procurement/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string } | null;

const actor = async () => {
  const { user, profile } = await requireStaff();
  return { userId: user.id, role: profile.role };
};

export async function recordPurchaseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await recordPurchase(await actor(), Object.fromEntries(formData));
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/purchases");
  revalidatePath("/ledger");
  return { ok: true };
}

export async function payPurchaseAction(poId: number, amount: string): Promise<ActionState> {
  const result = await payPurchase(await actor(), poId, amount);
  revalidatePath("/purchases");
  revalidatePath("/ledger");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
