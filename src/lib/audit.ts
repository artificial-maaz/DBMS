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
}
