import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { branchAssets, branches } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { moneyRequired } from "@/lib/validation";

type Actor = { userId: string; role: string };

export const canManageAssets = (role: string) => ["creator", "owner"].includes(role);
export const canViewAssets = (role: string) => ["creator", "owner", "silent_partner"].includes(role);

const assetSchema = z.object({
  branchId: z.coerce.number().int().positive("Branch is required"),
  name: z.string().trim().min(2, "Asset name required").max(120),
  category: z.enum(["furniture", "device", "appliance", "crockery", "other"]).default("other"),
  qty: z.coerce.number().int().min(1).default(1),
  unitValue: moneyRequired,
  purchasedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function createAsset(actor: Actor, raw: unknown) {
  if (!canManageAssets(actor.role)) return { ok: false as const, error: "Not allowed." };
  const p = assetSchema.safeParse(raw);
  if (!p.success) return { ok: false as const, error: p.error.issues[0]?.message ?? "Invalid input" };
  const i = p.data;
  const [row] = await db
    .insert(branchAssets)
    .values({
      branchId: i.branchId,
      name: i.name,
      category: i.category,
      qty: i.qty,
      unitValue: i.unitValue,
      purchasedOn: i.purchasedOn || null,
      notes: i.notes || null,
      createdBy: actor.userId,
    })
    .returning({ id: branchAssets.id });
  await writeAudit({
    userId: actor.userId,
    action: "asset.create",
    entity: "branch_asset",
    entityId: row.id,
    branchId: i.branchId,
    details: { name: i.name, qty: i.qty, unitValue: i.unitValue },
  });
  return { ok: true as const };
}

export async function setAssetActive(actor: Actor, assetId: number, isActive: boolean) {
  if (!canManageAssets(actor.role)) return { ok: false as const, error: "Not allowed." };
  await db.update(branchAssets).set({ isActive }).where(eq(branchAssets.id, assetId));
  await writeAudit({
    userId: actor.userId,
    action: isActive ? "asset.reactivate" : "asset.retire",
    entity: "branch_asset",
    entityId: assetId,
  });
  return { ok: true as const };
}

export function listAssets() {
  return db
    .select({
      id: branchAssets.id,
      name: branchAssets.name,
      category: branchAssets.category,
      qty: branchAssets.qty,
      unitValue: branchAssets.unitValue,
      purchasedOn: branchAssets.purchasedOn,
      isActive: branchAssets.isActive,
      branchName: branches.name,
    })
    .from(branchAssets)
    .innerJoin(branches, eq(branchAssets.branchId, branches.id))
    .orderBy(asc(branches.name), asc(branchAssets.name));
}
