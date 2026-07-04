import { db } from "@/db";
import { ledgerEntries } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { canRecordEntry, seesAllBranches } from "./permissions";
import { createEntrySchema } from "./validators";

type Actor = { userId: string; role: string; branchId: number | null };

/**
 * APPEND-ONLY by construction: this module exposes no update or delete.
 * A wrong entry is fixed by recording a reversing entry — like real books.
 */
export async function recordEntry(actor: Actor, raw: unknown) {
  if (!canRecordEntry(actor.role)) return { ok: false as const, error: "Not allowed to record ledger entries." };

  const parsed = createEntrySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  if (!seesAllBranches(actor.role) && input.branchId !== actor.branchId) {
    return { ok: false as const, error: "You can only record entries for your own branch." };
  }

  try {
    const [row] = await db
      .insert(ledgerEntries)
      .values({
        branchId: input.branchId,
        direction: input.direction,
        category: input.category,
        amount: input.amount,
        description: input.description,
        entryDate: input.entryDate,
        createdBy: actor.userId,
      })
      .returning({ id: ledgerEntries.id });

    await writeAudit({
      userId: actor.userId,
      action: "ledger.record",
      entity: "ledger_entry",
      entityId: row.id,
      branchId: input.branchId,
      details: { direction: input.direction, category: input.category, amount: input.amount },
    });

    return { ok: true as const, id: row.id };
  } catch {
    return { ok: false as const, error: "Failed to record entry." };
  }
}
