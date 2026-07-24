import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { partMovements, spareParts } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { moneyOptional } from "@/lib/validation";

type Actor = { userId: string; role: string; branchId: number | null };

export const canManageParts = (role: string) =>
  ["creator", "owner", "branch_manager"].includes(role);
export const canSeeCostPrice = (role: string) => ["creator", "owner", "silent_partner"].includes(role);
export const seesAllBranches = (role: string) => ["creator", "owner", "silent_partner"].includes(role);

const partSchema = z.object({
  name: z.string().trim().min(2, "Part name required").max(120),
  partNo: z.string().trim().max(60).optional().or(z.literal("")),
  sku: z.string().trim().max(60).optional().or(z.literal("")),
  branchId: z.coerce.number().int().positive("Branch is required"),
  initialQty: z.coerce.number().int().min(0).default(0),
  costPrice: moneyOptional,
  retailPrice: moneyOptional,
  lowStockAt: z.coerce.number().int().min(0).default(2),
});

export async function createPart(actor: Actor, raw: unknown) {
  if (!canManageParts(actor.role)) return { ok: false as const, error: "Not allowed." };
  const parsed = partSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  if (!seesAllBranches(actor.role) && input.branchId !== actor.branchId) {
    return { ok: false as const, error: "You can only add parts to your own branch." };
  }
  const costPrice = canSeeCostPrice(actor.role) && input.costPrice ? input.costPrice : null;

  try {
    const result = await db.transaction(async (tx) => {
      const [part] = await tx
        .insert(spareParts)
        .values({
          name: input.name,
          partNo: input.partNo || null,
          sku: input.sku || null,
          branchId: input.branchId,
          currentQty: input.initialQty,
          costPrice,
          retailPrice: input.retailPrice || null,
          lowStockAt: input.lowStockAt,
          createdBy: actor.userId,
        })
        .returning({ id: spareParts.id });

      if (input.initialQty > 0) {
        await tx.insert(partMovements).values({
          partId: part.id,
          delta: input.initialQty,
          reason: "initial",
          createdBy: actor.userId,
        });
      }
      return part;
    });

    await writeAudit({
      userId: actor.userId,
      action: "part.create",
      entity: "spare_part",
      entityId: result.id,
      branchId: input.branchId,
      details: { name: input.name, initialQty: input.initialQty },
    });
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Failed to save part." };
  }
}

const adjustSchema = z.object({
  partId: z.coerce.number().int().positive(),
  delta: z.coerce.number().int().refine((v) => v !== 0, "Quantity change cannot be zero"),
  reason: z.enum(["restock", "adjustment"]),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

/** Stock change = movement row + atomic quantity update; never goes negative. */
export async function adjustStock(actor: Actor, raw: unknown) {
  if (!canManageParts(actor.role)) return { ok: false as const, error: "Not allowed." };
  const parsed = adjustSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      const [part] = await tx.select().from(spareParts).where(eq(spareParts.id, input.partId)).for("update");
      if (!part) throw new Error("Part not found.");
      if (!seesAllBranches(actor.role) && part.branchId !== actor.branchId) {
        throw new Error("You can only adjust stock in your own branch.");
      }
      const newQty = part.currentQty + input.delta;
      if (newQty < 0) throw new Error(`Only ${part.currentQty} in stock — cannot deduct ${-input.delta}.`);

      await tx.update(spareParts).set({ currentQty: newQty }).where(eq(spareParts.id, part.id));
      await tx.insert(partMovements).values({
        partId: part.id,
        delta: input.delta,
        reason: input.reason,
        note: input.note || null,
        createdBy: actor.userId,
      });
      return { partId: part.id, branchId: part.branchId, newQty };
    });

    await writeAudit({
      userId: actor.userId,
      action: "part.adjust",
      entity: "spare_part",
      entityId: result.partId,
      branchId: result.branchId,
      details: { delta: input.delta, reason: input.reason, newQty: result.newQty },
    });
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to adjust stock." };
  }
}

/** Branch-scoped catalog; costPrice only selected for creator/owner. */
export async function listParts(opts: { role: string; ownBranchId: number | null; branchId?: number }) {
  const showCost = canSeeCostPrice(opts.role);
  const all = seesAllBranches(opts.role);
  const branchFilter = all
    ? opts.branchId
      ? eq(spareParts.branchId, opts.branchId)
      : undefined
    : eq(spareParts.branchId, opts.ownBranchId ?? -1);

  return db
    .select({
      id: spareParts.id,
      name: spareParts.name,
      partNo: spareParts.partNo,
      sku: spareParts.sku,
      currentQty: spareParts.currentQty,
      lowStockAt: spareParts.lowStockAt,
      retailPrice: spareParts.retailPrice,
      ...(showCost ? { costPrice: spareParts.costPrice } : {}),
      branchName: sql<string>`(select name from branches where id = ${spareParts.branchId})`,
      isActive: spareParts.isActive,
    })
    .from(spareParts)
    .where(branchFilter)
    .orderBy(spareParts.name);
}
