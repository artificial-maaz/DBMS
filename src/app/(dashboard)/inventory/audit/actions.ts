"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { seesAllBranches } from "@/modules/inventory/permissions";
import { requireStaff } from "@/lib/session";

export type AuditResult = {
  ok: boolean;
  error?: string;
  verified?: { chassisNo: string; label: string }[];
  missing?: { chassisNo: string; label: string }[]; // system says in stock, staff couldn't find it
} | null;

/**
 * #22a (reworked per Sir 2026-07-14): MANUAL audit — no scanning, no typing.
 * The page lists what the system says is in stock; staff walk the floor and
 * tick what they physically see. Unticked = missing. Read-only + audit-logged.
 */
export async function stockAuditAction(_prev: AuditResult, formData: FormData): Promise<AuditResult> {
  const { user, profile } = await requireStaff();
  if (!["creator", "owner", "branch_manager"].includes(profile.role)) {
    return { ok: false, error: "Not allowed." };
  }

  const branchId = Number(formData.get("branchId"));
  if (!branchId) return { ok: false, error: "Branch missing." };
  if (!seesAllBranches(profile.role) && branchId !== profile.branchId) {
    return { ok: false, error: "You can only audit your own branch." };
  }

  const presentIds = formData
    .getAll("present")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);

  // Re-fetch from DB — the submitted list is never trusted as the source of truth.
  const inStock = await db
    .select({ id: vehicles.id, chassisNo: vehicles.chassisNo, make: vehicles.make, model: vehicles.model, color: vehicles.color })
    .from(vehicles)
    .where(and(eq(vehicles.branchId, branchId), eq(vehicles.status, "in_stock")));

  const presentSet = new Set(
    presentIds.length > 0
      ? (
          await db
            .select({ id: vehicles.id })
            .from(vehicles)
            .where(and(inArray(vehicles.id, presentIds), eq(vehicles.branchId, branchId), eq(vehicles.status, "in_stock")))
        ).map((v) => v.id)
      : [],
  );

  const label = (v: (typeof inStock)[number]) => `${v.make} ${v.model}${v.color ? ` (${v.color})` : ""}`;
  const verified = inStock.filter((v) => presentSet.has(v.id)).map((v) => ({ chassisNo: v.chassisNo, label: label(v) }));
  const missing = inStock.filter((v) => !presentSet.has(v.id)).map((v) => ({ chassisNo: v.chassisNo, label: label(v) }));

  await writeAudit({
    userId: user.id,
    action: "inventory.stock_audit",
    entity: "branch",
    entityId: branchId,
    branchId,
    details: { expected: inStock.length, verified: verified.length, missing: missing.length },
  });

  return { ok: true, verified, missing };
}
