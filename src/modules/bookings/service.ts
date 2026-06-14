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

  // Cross-branch ops (Sir 2026-07-31): tokens may be registered for any branch —
  // the cash-in posts to the CHOSEN branch's ledger, and the sale must later happen
  // at that same branch (enforced in sales/service.ts), so per-branch books stay true.

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

  try {
    // Lock + re-check INSIDE the transaction: a concurrent sale (createSale
    // locks this same row FOR UPDATE) could convert this booking mid-flight —
    // checking status outside the tx risked refunding an already-applied token.
    const booking = await db.transaction(async (tx) => {
      const [b] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).for("update");
      if (!b) throw new Error("Booking not found.");
      if (!seesAllBranches(actor.role) && b.branchId !== actor.branchId) {
        throw new Error("You can only manage bookings at your own branch.");
      }
      if (b.status !== "open") throw new Error(`This booking is already ${b.status}.`);

      await tx.update(bookings).set({ status }).where(eq(bookings.id, bookingId));

      if (status === "refunded" && b.ledgerEntryId) {
        await tx.insert(ledgerEntries).values({
          branchId: b.branchId,
          direction: "cash_out",
          paymentMethod: b.paymentMethod,
          category: "booking_token",
          amount: b.tokenAmount,
          description: `Refund — booking token for ${b.modelWanted}`,
          reversesEntryId: b.ledgerEntryId,
          entryDate: new Date().toISOString().slice(0, 10),
          createdBy: actor.userId,
        });
      }
      return b;
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
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to update booking." };
  }
}
