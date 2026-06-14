import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, visitors } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { canConvertVisitor, canCreateVisitor, canEditVisitor, seesAllBranches } from "./permissions";
import { createVisitorSchema, updateVisitorSchema } from "./validators";

type Actor = { userId: string; role: string; branchId: number | null };

export async function createVisitor(actor: Actor, raw: unknown) {
  if (!canCreateVisitor(actor.role)) {
    return { ok: false as const, error: "You are not allowed to log visitors." };
  }

  const parsed = createVisitorSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  // Cross-branch ops (Sir 2026-07-31): visitors may be logged for any branch.

  try {
    const [row] = await db
      .insert(visitors)
      .values({
        fullName: input.fullName,
        phone: input.phone,
        cnic: input.cnic || null,
        interest: input.interest || null,
        budget: input.budget || null,
        source: input.source,
        notes: input.notes || null,
        followUpDate: input.followUpDate || null,
        branchId: input.branchId,
        createdBy: actor.userId,
      })
      .returning({ id: visitors.id });

    await writeAudit({
      userId: actor.userId,
      action: "visitor.create",
      entity: "visitor",
      entityId: row.id,
      branchId: input.branchId,
      details: { fullName: input.fullName, phone: input.phone, source: input.source },
    });

    return { ok: true as const, id: row.id };
  } catch {
    return { ok: false as const, error: "Failed to save visitor." };
  }
}

export async function updateVisitor(actor: Actor, visitorId: number, raw: unknown) {
  if (!canEditVisitor(actor.role)) return { ok: false as const, error: "You are not allowed to edit visitors." };

  const parsed = updateVisitorSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  const existing = await db.query.visitors.findFirst({ where: (v, { eq }) => eq(v.id, visitorId) });
  if (!existing) return { ok: false as const, error: "Visitor not found." };
  if (!seesAllBranches(actor.role) && existing.branchId !== actor.branchId) {
    return { ok: false as const, error: "You can only edit visitors at your own branch." };
  }
  if (existing.status === "converted") {
    return { ok: false as const, error: "This visitor already converted to a customer — edit the customer record instead." };
  }

  await db
    .update(visitors)
    .set({
      fullName: input.fullName,
      phone: input.phone,
      cnic: input.cnic || null,
      interest: input.interest || null,
      budget: input.budget || null,
      source: input.source,
      status: input.status,
      notes: input.notes || null,
      followUpDate: input.followUpDate || null,
    })
    .where(eq(visitors.id, visitorId));

  await writeAudit({
    userId: actor.userId,
    action: "visitor.update",
    entity: "visitor",
    entityId: visitorId,
    branchId: existing.branchId,
    details: { fullName: input.fullName, status: input.status },
  });

  return { ok: true as const };
}

/**
 * Convert a lead into a real customer. One-way door: once converted, the
 * visitor record is frozen (see updateVisitor above) and points at the new
 * customer row, so the lead → buyer trail stays intact for reporting.
 */
export async function convertVisitorToCustomer(actor: Actor, visitorId: number) {
  if (!canConvertVisitor(actor.role)) {
    return { ok: false as const, error: "You are not allowed to convert visitors." };
  }

  try {
    // Lock the visitor row inside the transaction — two staff double-clicking
    // "Convert" concurrently must not create two customer rows for one lead.
    const { customerId, visitor } = await db.transaction(async (tx) => {
      const [v] = await tx.select().from(visitors).where(eq(visitors.id, visitorId)).for("update");
      if (!v) throw new Error("Visitor not found.");
      if (!seesAllBranches(actor.role) && v.branchId !== actor.branchId) {
        throw new Error("You can only convert visitors at your own branch.");
      }
      if (v.status === "converted" && v.convertedCustomerId) {
        return { customerId: v.convertedCustomerId, visitor: v }; // idempotent — already converted
      }

      const [customer] = await tx
        .insert(customers)
        .values({
          fullName: v.fullName,
          phone: v.phone,
          cnic: v.cnic,
          branchId: v.branchId,
          createdBy: actor.userId,
        })
        .returning({ id: customers.id });

      await tx
        .update(visitors)
        .set({ status: "converted", convertedCustomerId: customer.id })
        .where(eq(visitors.id, visitorId));

      return { customerId: customer.id, visitor: v };
    });

    await writeAudit({
      userId: actor.userId,
      action: "visitor.convert",
      entity: "customer",
      entityId: customerId,
      branchId: visitor.branchId,
      details: { visitorId, fullName: visitor.fullName },
    });

    return { ok: true as const, customerId };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to convert visitor." };
  }
}
