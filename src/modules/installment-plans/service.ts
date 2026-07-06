import { eq } from "drizzle-orm";
import { db } from "@/db";
import { installmentPlans } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { canManagePlans } from "./permissions";
import { planSchema } from "./validators";

type Actor = { userId: string; role: string };

export async function createPlan(actor: Actor, raw: unknown) {
  if (!canManagePlans(actor.role)) return { ok: false as const, error: "Not allowed to manage rate cards." };

  const parsed = planSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  try {
    const [row] = await db
      .insert(installmentPlans)
      .values({ ...input, notes: input.notes || null, createdBy: actor.userId })
      .returning({ id: installmentPlans.id });

    await writeAudit({
      userId: actor.userId,
      action: "plan.create",
      entity: "installment_plan",
      entityId: row.id,
      details: { company: input.company, model: input.model },
    });
    return { ok: true as const, id: row.id };
  } catch (e) {
    const dup = e instanceof Error && e.message.includes("duplicate");
    return { ok: false as const, error: dup ? "This company + model already has a plan." : "Failed to save plan." };
  }
}

export async function updatePlan(actor: Actor, planId: number, raw: unknown) {
  if (!canManagePlans(actor.role)) return { ok: false as const, error: "Not allowed to manage rate cards." };

  const parsed = planSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  await db
    .update(installmentPlans)
    .set({ ...input, notes: input.notes || null })
    .where(eq(installmentPlans.id, planId));

  await writeAudit({
    userId: actor.userId,
    action: "plan.update",
    entity: "installment_plan",
    entityId: planId,
    details: { company: input.company, model: input.model },
  });
  return { ok: true as const };
}

export async function setPlanActive(actor: Actor, planId: number, isActive: boolean) {
  if (!canManagePlans(actor.role)) return { ok: false as const, error: "Not allowed." };
  await db.update(installmentPlans).set({ isActive }).where(eq(installmentPlans.id, planId));
  await writeAudit({
    userId: actor.userId,
    action: isActive ? "plan.activate" : "plan.deactivate",
    entity: "installment_plan",
    entityId: planId,
  });
  return { ok: true as const };
}
