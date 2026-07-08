import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { laborRates } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { moneyRequired } from "@/lib/validation";

type Actor = { userId: string; role: string };

/** Pricing is management policy: Creator/Owner set it; workshop roles read it. */
export const canManageRates = (role: string) => ["creator", "owner"].includes(role);
export const canViewRates = (role: string) =>
  ["creator", "owner", "branch_manager", "mechanic"].includes(role);

const rateSchema = z.object({
  serviceName: z.string().trim().min(3, "Service name required").max(150),
  price: moneyRequired.refine((v) => Number(v) > 0, "Price must be positive"),
  equipment: z.string().trim().max(150).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function createRate(actor: Actor, raw: unknown) {
  if (!canManageRates(actor.role)) return { ok: false as const, error: "Not allowed." };
  const parsed = rateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const i = parsed.data;

  try {
    const [row] = await db
      .insert(laborRates)
      .values({
        serviceName: i.serviceName,
        price: i.price,
        equipment: i.equipment || null,
        notes: i.notes || null,
        createdBy: actor.userId,
      })
      .returning({ id: laborRates.id });
    await writeAudit({
      userId: actor.userId,
      action: "laborrate.create",
      entity: "labor_rate",
      entityId: row.id,
      details: { serviceName: i.serviceName, price: i.price },
    });
    return { ok: true as const };
  } catch (e) {
    const dup = e instanceof Error && e.message.includes("duplicate");
    return { ok: false as const, error: dup ? "A service with this name already exists." : "Failed to save rate." };
  }
}

export async function updateRate(actor: Actor, rateId: number, raw: unknown) {
  if (!canManageRates(actor.role)) return { ok: false as const, error: "Not allowed." };
  const parsed = rateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const i = parsed.data;

  await db
    .update(laborRates)
    .set({ serviceName: i.serviceName, price: i.price, equipment: i.equipment || null, notes: i.notes || null })
    .where(eq(laborRates.id, rateId));
  await writeAudit({
    userId: actor.userId,
    action: "laborrate.update",
    entity: "labor_rate",
    entityId: rateId,
    details: { serviceName: i.serviceName, price: i.price },
  });
  return { ok: true as const };
}

export async function setRateActive(actor: Actor, rateId: number, isActive: boolean) {
  if (!canManageRates(actor.role)) return { ok: false as const, error: "Not allowed." };
  await db.update(laborRates).set({ isActive }).where(eq(laborRates.id, rateId));
  await writeAudit({
    userId: actor.userId,
    action: isActive ? "laborrate.reactivate" : "laborrate.retire",
    entity: "labor_rate",
    entityId: rateId,
  });
  return { ok: true as const };
}

export function listRates(activeOnly = false) {
  return db
    .select()
    .from(laborRates)
    .where(activeOnly ? eq(laborRates.isActive, true) : undefined)
    .orderBy(asc(laborRates.serviceName));
}
