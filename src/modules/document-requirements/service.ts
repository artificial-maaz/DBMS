import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documentRequirements } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { canManageRequirements } from "./permissions";
import { requirementSchema } from "./validators";

type Actor = { userId: string; role: string };

export async function createRequirement(actor: Actor, raw: unknown) {
  if (!canManageRequirements(actor.role)) return { ok: false as const, error: "Not allowed to manage the checklist." };

  const parsed = requirementSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  try {
    const [row] = await db
      .insert(documentRequirements)
      .values({ name: input.name, createdBy: actor.userId })
      .returning({ id: documentRequirements.id });

    await writeAudit({
      userId: actor.userId,
      action: "document_requirement.create",
      entity: "document_requirement",
      entityId: row.id,
      details: { name: input.name },
    });
    return { ok: true as const, id: row.id };
  } catch (e) {
    const dup = e instanceof Error && e.message.includes("duplicate");
    return { ok: false as const, error: dup ? "This requirement already exists." : "Failed to save requirement." };
  }
}

export async function updateRequirement(actor: Actor, requirementId: number, raw: unknown) {
  if (!canManageRequirements(actor.role)) return { ok: false as const, error: "Not allowed to manage the checklist." };

  const parsed = requirementSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  await db.update(documentRequirements).set({ name: input.name }).where(eq(documentRequirements.id, requirementId));

  await writeAudit({
    userId: actor.userId,
    action: "document_requirement.update",
    entity: "document_requirement",
    entityId: requirementId,
    details: { name: input.name },
  });
  return { ok: true as const };
}

export async function setRequirementActive(actor: Actor, requirementId: number, isActive: boolean) {
  if (!canManageRequirements(actor.role)) return { ok: false as const, error: "Not allowed." };
  await db.update(documentRequirements).set({ isActive }).where(eq(documentRequirements.id, requirementId));
  await writeAudit({
    userId: actor.userId,
    action: isActive ? "document_requirement.activate" : "document_requirement.deactivate",
    entity: "document_requirement",
    entityId: requirementId,
  });
  return { ok: true as const };
}
