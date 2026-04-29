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

/**
 * Register a customer WITHOUT leaving New Sale (Sir, 2026-08-06).
 *
 * A first-time buyer used to force a detour: Customers → add → back to Sales →
 * find them in the list. Now the walk-in is captured where the sale is being
 * made. It goes through the same createCustomer service, so validation,
 * normalisation, branch rules and the audit trail are all identical — this is
 * a shortcut in the UI, not a bypass of the rules.
 */
export async function quickCreateCustomerAction(
  _prev: QuickCustomerState,
  formData: FormData,
): Promise<QuickCustomerState> {
  const { user, profile } = await requireStaff();
  const { createCustomer } = await import("@/modules/customers/service");
  const result = await createCustomer(
    { userId: user.id, role: profile.role, branchId: profile.branchId },
    Object.fromEntries(formData),
  );
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/customers");
  return {
    ok: true,
    customer: {
      id: result.id,
      label: `${String(formData.get("fullName") ?? "").trim()} (${String(formData.get("phone") ?? "").trim()})`,
    },
  };
}

export type QuickCustomerState =
  | { ok: true; customer: { id: number; label: string } }
  | { ok: false; error?: string }
  | null;

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
