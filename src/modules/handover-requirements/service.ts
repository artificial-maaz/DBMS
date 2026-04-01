import { eq } from "drizzle-orm";
import { db } from "@/db";
import { handoverRequirements } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { canManageHandoverItems } from "./permissions";
import { handoverItemSchema } from "./validators";

type Actor = { userId: string; role: string };

export async function createHandoverItem(actor: Actor, raw: unknown) {
  if (!canManageHandoverItems(actor.role)) {
    return { ok: false as const, error: "Not allowed to manage the handover checklist." };
  }

  const parsed = handoverItemSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  try {
    const [row] = await db
      .insert(handoverRequirements)
      .values({ name: input.name, createdBy: actor.userId })
      .returning({ id: handoverRequirements.id });

    await writeAudit({
      userId: actor.userId,
      action: "handover_requirement.create",
      entity: "handover_requirement",
      entityId: row.id,
      details: { name: input.name },
    });
    return { ok: true as const, id: row.id };
  } catch (e) {
    const dup = e instanceof Error && e.message.includes("duplicate");
    return { ok: false as const, error: dup ? "This handover item already exists." : "Failed to save handover item." };
  }
}

export async function updateHandoverItem(actor: Actor, itemId: number, raw: unknown) {
  if (!canManageHandoverItems(actor.role)) {
    return { ok: false as const, error: "Not allowed to manage the handover checklist." };
  }

  const parsed = handoverItemSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  await db.update(handoverRequirements).set({ name: input.name }).where(eq(handoverRequirements.id, itemId));

  await writeAudit({
    userId: actor.userId,
    action: "handover_requirement.update",
    entity: "handover_requirement",
    entityId: itemId,
    details: { name: input.name },
  });
  return { ok: true as const };
}

export async function setHandoverItemActive(actor: Actor, itemId: number, isActive: boolean) {
  if (!canManageHandoverItems(actor.role)) return { ok: false as const, error: "Not allowed." };
  await db.update(handoverRequirements).set({ isActive }).where(eq(handoverRequirements.id, itemId));
  await writeAudit({
    userId: actor.userId,
    action: isActive ? "handover_requirement.activate" : "handover_requirement.deactivate",
    entity: "handover_requirement",
    entityId: itemId,
  });
  return { ok: true as const };
}
