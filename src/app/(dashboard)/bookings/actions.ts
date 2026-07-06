"use server";

import { revalidatePath } from "next/cache";
import { createBooking, setBookingStatus } from "@/modules/bookings/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string } | null;

export async function addBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireStaff();
  const result = await createBooking(
    { userId: user.id, role: profile.role, branchId: profile.branchId },
    Object.fromEntries(formData),
  );
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/bookings");
  revalidatePath("/ledger");
  return { ok: true };
}

export async function bookingStatusAction(bookingId: number, status: "cancelled" | "refunded") {
  const { user, profile } = await requireStaff();
  const result = await setBookingStatus(
    { userId: user.id, role: profile.role, branchId: profile.branchId },
    bookingId,
    status,
  );
  revalidatePath("/bookings");
  revalidatePath("/ledger");
  return result;
}
