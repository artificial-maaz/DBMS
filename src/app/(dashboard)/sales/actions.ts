"use server";

import { revalidatePath } from "next/cache";
import { createSale, recordInstallmentPayment, setDocumentCustody, setWarrantyCardSent } from "@/modules/sales/service";
import { gateOrEnqueue } from "@/modules/approvals/service";
import { requireStaff } from "@/lib/session";

export type SaleActionState = { ok: boolean; error?: string; invoiceNo?: string; queued?: boolean } | null;

export async function createSaleAction(_prev: SaleActionState, formData: FormData): Promise<SaleActionState> {
  const { user, profile } = await requireStaff();
  const actor = { userId: user.id, role: profile.role, branchId: profile.branchId };
  const payload = Object.fromEntries(formData);

  // Maker-checker: staff sales wait for owner approval.
  const gate = await gateOrEnqueue(actor, "sale.create", payload);
  if (gate.queued) {
    revalidatePath("/approvals");
    return { ok: true, queued: true };
  }

  const result = await createSale(actor, payload);

  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { ok: true, invoiceNo: result.invoiceNo };
}

export async function warrantyCardSentAction(invoiceId: number): Promise<SaleActionState> {
  const { user, profile } = await requireStaff();
  const result = await setWarrantyCardSent(
    { userId: user.id, role: profile.role, branchId: profile.branchId },
    invoiceId,
  );
  revalidatePath("/sales");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function documentCustodyAction(
  docId: number,
  custody: "given_to_customer" | "held_by_dealer" | "pending",
): Promise<SaleActionState> {
  const { user, profile } = await requireStaff();
  const result = await setDocumentCustody(
    { userId: user.id, role: profile.role, branchId: profile.branchId },
    docId,
    custody,
  );
  revalidatePath("/sales");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function collectPaymentAction(
  _prev: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  const { user, profile } = await requireStaff();
  const actor = { userId: user.id, role: profile.role, branchId: profile.branchId };
  const payload = { scheduleId: Number(formData.get("scheduleId")), amount: String(formData.get("amount") ?? "") };

  const gate = await gateOrEnqueue(actor, "installment.payment", payload);
  if (gate.queued) {
    revalidatePath("/approvals");
    return { ok: true, queued: true };
  }

  const result = await recordInstallmentPayment(actor, payload);

  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { ok: true };
}
