"use server";

import { revalidatePath } from "next/cache";
import { createBooking, setBookingStatus } from "@/modules/bookings/service";
import { gateOrEnqueue } from "@/modules/approvals/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string; queued?: boolean } | null;

export async function addBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const actor = { userId: user.id, role: profile.role, branchId: profile.branchId };
  const payload = Object.fromEntries(formData);

  const gate = await gateOrEnqueue(actor, "booking.create", payload);
  if (gate.queued) {
    revalidatePath("/approvals");
    return { ok: true, queued: true };
  }

  const result = await createBooking(actor, payload);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/bookings");
  revalidatePath("/ledger");
  return { ok: true };
}

export async function bookingStatusAction(bookingId: number, status: "cancelled" | "refunded") {
  const { user, profile } = await requireStaff();
  const actor = { userId: user.id, role: profile.role, branchId: profile.branchId };

  const gate = await gateOrEnqueue(actor, `booking.${status === "refunded" ? "refund" : "cancel"}`, { bookingId });
  if (gate.queued) {
    revalidatePath("/approvals");
    return { ok: true as const, queued: true };
  }

  const result = await setBookingStatus(actor, bookingId, status);
  revalidatePath("/bookings");
  revalidatePath("/ledger");
  return result;
}
