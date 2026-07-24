import { and, count, desc, eq, gt, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, notificationState, user } from "@/db/schema";

/**
 * #27: Creator notifications — derived straight from the audit log.
 * No second event pipeline to maintain: if it's audited (everything is),
 * it can notify. Email/WhatsApp delivery can later reuse IMPORTANT_ACTIONS.
 */
export const canSeeNotifications = (role: string) => role === "creator";

/** The events the Creator actually wants to be tapped on the shoulder for. */
export const IMPORTANT_ACTIONS = [
  "approval.submit",
  "approval.approve",
  "approval.reject",
  "sale.create",
  "installment.payment",
  "ledger.record",
  "vehicle.create",
  "part.create",
  "part.adjust",
  "booking.create",
  "booking.refund",
  "gatepass.issue",
  "gatepass.receive",
  "inventory.stock_audit",
  "staff.create",
  "staff.deactivate",
  "staff.reactivate",
  "purchase.create",
  "purchase.pay",
  "payroll.release",
  "settings.update",
  "import.vehicles",
  "import.customers",
  "import.visitors",
  "invoice.warranty_card_sent",
] as const;

async function lastSeen(userId: string) {
  const row = await db.query.notificationState.findFirst({ where: (n, { eq }) => eq(n.userId, userId) });
  return row?.lastSeenAt ?? new Date(0);
}

/** Unread badge count — events by OTHERS since the creator last looked. */
export async function unreadCount(actor: { userId: string; role: string }) {
  if (!canSeeNotifications(actor.role)) return 0;
  const since = await lastSeen(actor.userId);
  const [row] = await db
    .select({ n: count() })
    .from(auditLog)
    .where(
      and(
        gt(auditLog.createdAt, since),
        ne(auditLog.userId, actor.userId), // your own actions don't notify you
        inArray(auditLog.action, [...IMPORTANT_ACTIONS]),
      ),
    );
  return row.n;
}

/** The feed itself; visiting it moves the watermark (marks all as seen). */
export async function listNotifications(actor: { userId: string; role: string }) {
  if (!canSeeNotifications(actor.role)) return { since: new Date(), rows: [] };
  const since = await lastSeen(actor.userId);

  const rows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      details: auditLog.details,
      actorName: user.name,
      branchId: auditLog.branchId,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .innerJoin(user, eq(auditLog.userId, user.id))
    .where(and(ne(auditLog.userId, actor.userId), inArray(auditLog.action, [...IMPORTANT_ACTIONS])))
    .orderBy(desc(auditLog.createdAt))
    .limit(100);

  await db
    .insert(notificationState)
    .values({ userId: actor.userId, lastSeenAt: new Date() })
    .onConflictDoUpdate({ target: notificationState.userId, set: { lastSeenAt: new Date() } });

  return { since, rows };
}
