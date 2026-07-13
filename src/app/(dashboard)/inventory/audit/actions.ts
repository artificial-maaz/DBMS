"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { seesAllBranches } from "@/modules/inventory/permissions";
import { requireStaff } from "@/lib/session";

export type AuditResult = {
  ok: boolean;
  error?: string;
  matched?: string[];
  missing?: { chassisNo: string; label: string }[]; // in system, NOT scanned — investigate!
  unregistered?: string[]; // scanned, NOT in system stock
} | null;

/**
 * #22a: physical stock audit — reconcile what's physically on the floor
 * (scanned/pasted VINs) against what the system says is in stock at a branch.
 * Read-only: writes nothing but an audit-log entry recording the outcome.
 */
export async function stockAuditAction(_prev: AuditResult, formData: FormData): Promise<AuditResult> {
  const { user, profile } = await requireStaff();
  if (!["creator", "owner", "branch_manager"].includes(profile.role)) {
    return { ok: false, error: "Not allowed." };
  }

  const branchId = Number(formData.get("branchId"));
  if (!branchId) return { ok: false, error: "Pick a branch to audit." };
  if (!seesAllBranches(profile.role) && branchId !== profile.branchId) {
    return { ok: false, error: "You can only audit your own branch." };
  }

  const scanned = String(formData.get("vins") ?? "")
    .split(/[\n,;]+/)
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);
  if (scanned.length === 0) return { ok: false, error: "Paste or scan at least one chassis/VIN." };
  const scannedSet = new Set(scanned);

  const inStock = await db
    .select({ chassisNo: vehicles.chassisNo, make: vehicles.make, model: vehicles.model, color: vehicles.color })
    .from(vehicles)
    .where(and(eq(vehicles.branchId, branchId), eq(vehicles.status, "in_stock")));

  const systemSet = new Set(inStock.map((v) => v.chassisNo.toUpperCase()));
  const matched = scanned.filter((v) => systemSet.has(v));
  const missing = inStock
    .filter((v) => !scannedSet.has(v.chassisNo.toUpperCase()))
    .map((v) => ({ chassisNo: v.chassisNo, label: `${v.make} ${v.model}${v.color ? ` (${v.color})` : ""}` }));
  const unregistered = scanned.filter((v) => !systemSet.has(v));

  await writeAudit({
    userId: user.id,
    action: "inventory.stock_audit",
    entity: "branch",
    entityId: branchId,
    branchId,
    details: { scanned: scanned.length, matched: matched.length, missing: missing.length, unregistered: unregistered.length },
  });

  return { ok: true, matched, missing, unregistered };
}
