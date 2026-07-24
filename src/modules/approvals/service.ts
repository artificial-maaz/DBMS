import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pendingActions, user } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { createSale, recordInstallmentPayment } from "@/modules/sales/service";
import { recordEntry } from "@/modules/ledger/service";
import { createBooking, setBookingStatus } from "@/modules/bookings/service";
import { createVehicle } from "@/modules/inventory/service";
import { adjustStock, createPart } from "@/modules/parts/service";
import { cancelGatePass, issueGatePass, receiveGatePass } from "@/modules/gatepass/service";
import { advanceJob } from "@/modules/workshop/service";

type Actor = { userId: string; role: string; branchId: number | null };
type Outcome = { ok: boolean; error?: string };

export const canReview = (role: string) => ["creator", "owner"].includes(role);
/** Everyone below Owner — INCLUDING branch managers — goes through review. */
export const needsApproval = (role: string) => !canReview(role);

/**
 * The single gate every money/stock action calls first.
 * Owners/Creator: returns { queued:false } — execute directly as before.
 * Staff: stores the full action and returns { queued:true } — nothing executes.
 */
export async function gateOrEnqueue(
  actor: Actor,
  actionType: string,
  payload: unknown,
  branchId?: number | null,
): Promise<{ queued: boolean }> {
  if (!needsApproval(actor.role)) return { queued: false };

  const [row] = await db
    .insert(pendingActions)
    .values({
      actionType,
      payload,
      submittedBy: actor.userId,
      submitterRole: actor.role,
      submitterBranchId: actor.branchId,
      branchId: branchId ?? actor.branchId ?? null,
    })
    .returning({ id: pendingActions.id });

  await writeAudit({
    userId: actor.userId,
    action: "approval.submit",
    entity: "pending_action",
    entityId: row.id,
    branchId: branchId ?? actor.branchId,
    details: { actionType },
  });
  return { queued: true };
}

/** On approve, the ORIGINAL service runs under the ORIGINAL submitter's identity. */
type Payload = Record<string, unknown>;
const DISPATCH: Record<string, (actor: Actor, p: Payload) => Promise<Outcome>> = {
  "sale.create": (a, p) => createSale(a, p),
  "installment.payment": (a, p) => recordInstallmentPayment(a, p as { scheduleId: number; amount: string }),
  "ledger.record": (a, p) => recordEntry(a, p),
  "booking.create": (a, p) => createBooking(a, p),
  "booking.cancel": (a, p) => setBookingStatus(a, Number(p.bookingId), "cancelled"),
  "booking.refund": (a, p) => setBookingStatus(a, Number(p.bookingId), "refunded"),
  "vehicle.create": (a, p) => createVehicle(a, p),
  "part.create": (a, p) => createPart(a, p),
  "part.adjust": (a, p) => adjustStock(a, p),
  "job.deliver": (a, p) => advanceJob(a, { jobId: Number(p.jobId), to: "delivered" }),
  "gatepass.issue": (a, p) => issueGatePass(a, p),
  "gatepass.receive": (a, p) => receiveGatePass(a, Number(p.passId)),
  "gatepass.cancel": (a, p) => cancelGatePass(a, Number(p.passId)),
  // Stock audit verification: the "action" is the owner's confirmation itself.
  "stock.audit": async (a, p) => {
    await writeAudit({
      userId: a.userId,
      action: "inventory.stock_audit",
      entity: "branch",
      entityId: Number(p.branchId),
      branchId: Number(p.branchId),
      details: p,
    });
    return { ok: true };
  },
};

export async function reviewAction(
  reviewer: Actor,
  pendingId: number,
  decision: "approved" | "rejected",
  note?: string,
) {
  if (!canReview(reviewer.role)) return { ok: false as const, error: "Only Owners/Creator review." };

  const item = await db.query.pendingActions.findFirst({ where: (x, { eq }) => eq(x.id, pendingId) });
  if (!item) return { ok: false as const, error: "Item not found." };
  if (item.status !== "pending") return { ok: false as const, error: `Already ${item.status}.` };

  if (decision === "rejected") {
    await db
      .update(pendingActions)
      .set({ status: "rejected", reviewedBy: reviewer.userId, reviewNote: note || null, reviewedAt: new Date() })
      .where(and(eq(pendingActions.id, pendingId), eq(pendingActions.status, "pending")));
    await writeAudit({
      userId: reviewer.userId,
      action: "approval.reject",
      entity: "pending_action",
      entityId: pendingId,
      branchId: item.branchId,
      details: { actionType: item.actionType, submittedBy: item.submittedBy, note },
    });
    return { ok: true as const };
  }

  // APPROVE: submitter must still be an active staff member.
  const submitterProfile = await db.query.staffProfiles.findFirst({
    where: (s, { eq }) => eq(s.userId, item.submittedBy),
  });
  if (!submitterProfile?.isActive) {
    return { ok: false as const, error: "Submitter is no longer active staff — reject this item instead." };
  }

  const handler = DISPATCH[item.actionType];
  if (!handler) return { ok: false as const, error: `No handler for ${item.actionType}.` };

  const originalActor: Actor = {
    userId: item.submittedBy,
    role: item.submitterRole,
    branchId: item.submitterBranchId,
  };
  const result = await handler(originalActor, item.payload as Payload);

  if (!result.ok) {
    // Stays pending; the reviewer sees exactly why it can't execute (e.g. bike sold meanwhile).
    await db.update(pendingActions).set({ lastError: result.error ?? "Failed" }).where(eq(pendingActions.id, pendingId));
    return { ok: false as const, error: `Cannot approve — ${result.error}` };
  }

  await db
    .update(pendingActions)
    .set({ status: "approved", reviewedBy: reviewer.userId, reviewNote: note || null, reviewedAt: new Date(), lastError: null })
    .where(eq(pendingActions.id, pendingId));
  await writeAudit({
    userId: reviewer.userId,
    action: "approval.approve",
    entity: "pending_action",
    entityId: pendingId,
    branchId: item.branchId,
    details: { actionType: item.actionType, submittedBy: item.submittedBy },
  });
  return { ok: true as const };
}

/** Owners see everything; staff see their own submissions (read-only). */
export async function listApprovals(actor: Actor) {
  const mineOnly = !canReview(actor.role);
  return db
    .select({
      id: pendingActions.id,
      actionType: pendingActions.actionType,
      payload: pendingActions.payload,
      status: pendingActions.status,
      submittedBy: pendingActions.submittedBy,
      submitterName: user.name,
      branchId: pendingActions.branchId,
      reviewNote: pendingActions.reviewNote,
      lastError: pendingActions.lastError,
      createdAt: pendingActions.createdAt,
    })
    .from(pendingActions)
    .innerJoin(user, eq(pendingActions.submittedBy, user.id))
    .where(mineOnly ? eq(pendingActions.submittedBy, actor.userId) : undefined)
    .orderBy(desc(pendingActions.createdAt))
    .limit(100);
}

export async function pendingCount(actor: Actor) {
  const mineOnly = !canReview(actor.role);
  const [row] = await db
    .select({ n: count() })
    .from(pendingActions)
    .where(
      mineOnly
        ? and(eq(pendingActions.status, "pending"), eq(pendingActions.submittedBy, actor.userId))
        : eq(pendingActions.status, "pending"),
    );
  return row.n;
}
