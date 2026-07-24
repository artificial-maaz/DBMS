import { db } from "@/db";
import { auditLog } from "@/db/schema";

/**
 * Audit writer — call from every module service on every mutation.
 * (Day-one rule: who, what, when, where.)
 */
export async function writeAudit(entry: {
  userId: string;
  action: string;      // "vehicle.create"
  entity: string;      // "vehicle"
  entityId: string | number;
  branchId?: number | null;
  details?: unknown;
}) {
  await db.insert(auditLog).values({
    userId: entry.userId,
    action: entry.action,
    entity: entry.entity,
    entityId: String(entry.entityId),
    branchId: entry.branchId ?? null,
    details: entry.details ?? null,
  });

  // High-priority events also go out by email (Creator + Owners) — strictly
  // fire-and-forget: email failure must NEVER fail a business transaction.
  try {
    const { HIGH_PRIORITY_ACTIONS, sendHighPriorityEmail } = await import("@/modules/notifications/email");
    if (HIGH_PRIORITY_ACTIONS.has(entry.action)) {
      const actor = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.id, entry.userId) });
      void sendHighPriorityEmail(entry.action, actor?.name ?? "Someone", entry.details);
    }
  } catch {
    /* never block on email */
  }
}
