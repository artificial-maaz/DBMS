"use server";

import { revalidatePath } from "next/cache";
import { createSale, recordInstallmentPayment } from "@/modules/sales/service";
import { requireStaff } from "@/lib/session";

export type SaleActionState = { ok: boolean; error?: string; invoiceNo?: string } | null;

export async function createSaleAction(_prev: SaleActionState, formData: FormData): Promise<SaleActionState> {
  const { user, profile } = await requireStaff();

  const result = await createSale(
    { userId: user.id, role: profile.role, branchId: profile.branchId },
    Object.fromEntries(formData),
  );

  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { ok: true, invoiceNo: result.invoiceNo };
}

export async function collectPaymentAction(
  _prev: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  const { user, profile } = await requireStaff();

  const result = await recordInstallmentPayment(
    { userId: user.id, role: profile.role, branchId: profile.branchId },
    { scheduleId: Number(formData.get("scheduleId")), amount: String(formData.get("amount") ?? "") },
  );

  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { ok: true };
}
