import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { branches } from "@/db/schema";
import { writeAudit } from "@/lib/audit";

type Actor = { userId: string; role: string };

export function canManageBranches(role: string) {
  return ["creator", "owner"].includes(role);
}

const branchSchema = z.object({
  name: z.string().trim().min(2, "Name required").max(100),
  city: z.string().trim().min(2, "City required").max(60),
  address: z.string().trim().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

export async function createBranch(actor: Actor, raw: unknown) {
  if (!canManageBranches(actor.role)) return { ok: false as const, error: "Not allowed." };
  const parsed = branchSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const [row] = await db
      .insert(branches)
      .values({
        name: parsed.data.name,
        city: parsed.data.city,
        address: parsed.data.address || null,
        phone: parsed.data.phone || null,
      })
      .returning({ id: branches.id });

    await writeAudit({
      userId: actor.userId,
      action: "branch.create",
      entity: "branch",
      entityId: row.id,
      branchId: row.id,
      details: parsed.data,
    });
    return { ok: true as const };
  } catch (e) {
    const dup = e instanceof Error && e.message.includes("duplicate");
    return { ok: false as const, error: dup ? "A branch with this name already exists." : "Failed to create branch." };
  }
}

export async function setBranchActive(actor: Actor, branchId: number, isActive: boolean) {
  if (!canManageBranches(actor.role)) return { ok: false as const, error: "Not allowed." };
  await db.update(branches).set({ isActive }).where(eq(branches.id, branchId));
  await writeAudit({
    userId: actor.userId,
    action: isActive ? "branch.activate" : "branch.deactivate",
    entity: "branch",
    entityId: branchId,
    branchId,
  });
  return { ok: true as const };
}
