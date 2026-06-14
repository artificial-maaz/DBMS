import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { canEditCustomer, canCreateCustomer, seesAllBranches } from "./permissions";
import { createCustomerSchema } from "./validators";

type Actor = { userId: string; role: string; branchId: number | null };

export async function createCustomer(actor: Actor, raw: unknown) {
  if (!canCreateCustomer(actor.role)) {
    return { ok: false as const, error: "You are not allowed to register customers." };
  }

  const parsed = createCustomerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  // Cross-branch ops (Sir 2026-07-31): sales-floor roles may register customers
  // for ANY branch — audit records actor+branch, maker-checker still reviews staff.

  try {
    const [row] = await db
      .insert(customers)
      .values({
        fullName: input.fullName,
        phone: input.phone,
        cnic: input.cnic || null,
        email: input.email || null,
        address: input.address || null,
        city: input.city || null,
        branchId: input.branchId,
        createdBy: actor.userId,
      })
      .returning({ id: customers.id });

    await writeAudit({
      userId: actor.userId,
      action: "customer.create",
      entity: "customer",
      entityId: row.id,
      branchId: input.branchId,
      details: { fullName: input.fullName, phone: input.phone },
    });

    return { ok: true as const, id: row.id };
  } catch {
    return { ok: false as const, error: "Failed to save customer." };
  }
}

/** #3 (2026-07-06): edit an existing customer record — same shape as create. */
export async function updateCustomer(actor: Actor, customerId: number, raw: unknown) {
  if (!canEditCustomer(actor.role)) {
    return { ok: false as const, error: "You are not allowed to edit customers." };
  }

  const parsed = createCustomerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  const existing = await db.query.customers.findFirst({ where: (c, { eq }) => eq(c.id, customerId) });
  if (!existing) return { ok: false as const, error: "Customer not found." };
  if (!seesAllBranches(actor.role) && existing.branchId !== actor.branchId) {
    return { ok: false as const, error: "You can only edit customers in your own branch." };
  }
  // Cross-branch (2026-07-31): reassigning a customer to another branch is allowed.

  try {
    await db
      .update(customers)
      .set({
        fullName: input.fullName,
        phone: input.phone,
        cnic: input.cnic || null,
        email: input.email || null,
        address: input.address || null,
        city: input.city || null,
        branchId: input.branchId,
      })
      .where(eq(customers.id, customerId));

    await writeAudit({
      userId: actor.userId,
      action: "customer.update",
      entity: "customer",
      entityId: customerId,
      branchId: input.branchId,
      details: { fullName: input.fullName, phone: input.phone },
    });

    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Failed to update customer." };
  }
}
