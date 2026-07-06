import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, ledgerEntries } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { canCancelBooking, canCreateBooking, seesAllBranches } from "./permissions";
import { createBookingSchema } from "./validators";

type Actor = { userId: string; role: string; branchId: number | null };

/**
 * Register a token. Posts the cash-in ledger entry in the SAME transaction as
 * the booking row, and stores that entry's id (ledgerEntryId) so a later
 * refund reverses this exact entry — not a guess.
 */
export async function createBooking(actor: Actor, raw: unknown) {
  if (!canCreateBooking(actor.role)) return { ok: false as const, error: "Not allowed to register bookings." };

  const parsed = createBookingSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  if (!seesAllBranches(actor.role) && input.branchId !== actor.branchId) {
    return { ok: false as const, error: "You can only register bookings at your own branch." };
  }

  try {
    const bookingId = await db.transaction(async (tx) => {
      const [booking] = await tx
        .insert(bookings)
        .values({
          customerId: input.customerId ?? null,
          visitorId: input.visitorId ?? null,
          modelWanted: input.modelWanted,
          tokenAmount: input.tokenAmount,
          paymentMethod: input.paymentMethod,
          notes: input.notes || null,
          branchId: input.branchId,
          createdBy: actor.userId,
        })
        .returning({ id: bookings.id });

      const [entry] = await tx
        .insert(ledgerEntries)
        .values({
          branchId: input.branchId,
          direction: "cash_in",
          paymentMethod: input.paymentMethod,
          category: "booking_token",
          amount: input.tokenAmount,
          description: `Booking token — ${input.modelWanted}`,
          entryDate: new Date().toISOString().slice(0, 10),
          createdBy: actor.userId,
        })
        .returning({ id: ledgerEntries.id });

      await tx.update(bookings).set({ ledgerEntryId: entry.id }).where(eq(bookings.id, booking.id));

      return booking.id;
    });

    await writeAudit({
      userId: actor.userId,
      action: "booking.create",
      entity: "booking",
      entityId: bookingId,
      branchId: input.branchId,
      details: { modelWanted: input.modelWanted, tokenAmount: input.tokenAmount },
    });

    return { ok: true as const, id: bookingId };
  } catch {
    return { ok: false as const, error: "Failed to register booking." };
  }
}

/**
 * Cancel = forfeited token (dealership keeps the cash — no ledger reversal;
 * that money was legitimately received). Refund = the cash actually goes
 * back, so it posts a reversing cash_out entry for the exact original amount.
 */
export async function setBookingStatus(actor: Actor, bookingId: number, status: "cancelled" | "refunded") {
  if (!canCancelBooking(actor.role)) return { ok: false as const, error: "Not allowed." };

  const booking = await db.query.bookings.findFirst({ where: (b, { eq }) => eq(b.id, bookingId) });
  if (!booking) return { ok: false as const, error: "Booking not found." };
  if (!seesAllBranches(actor.role) && booking.branchId !== actor.branchId) {
    return { ok: false as const, error: "You can only manage bookings at your own branch." };
  }
  if (booking.status !== "open") {
    return { ok: false as const, error: `This booking is already ${booking.status}.` };
  }

  try {
    await db.transaction(async (tx) => {
      await tx.update(bookings).set({ status }).where(eq(bookings.id, bookingId));

      if (status === "refunded" && booking.ledgerEntryId) {
        await tx.insert(ledgerEntries).values({
          branchId: booking.branchId,
          direction: "cash_out",
          paymentMethod: booking.paymentMethod,
          category: "booking_token",
          amount: booking.tokenAmount,
          description: `Refund — booking token for ${booking.modelWanted}`,
          reversesEntryId: booking.ledgerEntryId,
          entryDate: new Date().toISOString().slice(0, 10),
          createdBy: actor.userId,
        });
      }
    });

    await writeAudit({
      userId: actor.userId,
      action: status === "refunded" ? "booking.refund" : "booking.cancel",
      entity: "booking",
      entityId: bookingId,
      branchId: booking.branchId,
      details: { modelWanted: booking.modelWanted, tokenAmount: booking.tokenAmount },
    });

    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Failed to update booking." };
  }
}
