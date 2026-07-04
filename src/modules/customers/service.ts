import { db } from "@/db";
import { customers } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { canCreateCustomer, seesAllBranches } from "./permissions";
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

  if (!seesAllBranches(actor.role) && input.branchId !== actor.branchId) {
    return { ok: false as const, error: "You can only register customers in your own branch." };
  }

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
