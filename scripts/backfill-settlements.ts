/**
 * One-time (idempotent) backfill for #15 — auto-settle completed cases.
 *
 * From 2026-08-09 the app decides an invoice's status itself: a case is
 * `settled` when nothing is owed AND no document we took is still in our
 * custody (see `syncInvoiceSettlement` in src/modules/sales/service.ts — this
 * script applies the SAME rule, deliberately, so the two never disagree).
 *
 * Every invoice written before that change is still sitting at `active`,
 * including every cash sale ever made, and nothing will touch those rows again
 * — a finished cash sale has no future payment or custody change to trigger a
 * recalculation. Hence this pass.
 *
 * Run once, after `npm run db:migrate`:   npm run db:settle
 * Safe to re-run: it only writes rows whose status actually disagrees with the
 * rule, and it never touches `cancelled` invoices.
 */
import { and, count, eq, ne } from "drizzle-orm";
import { db } from "../src/db";
import { invoiceDocuments, invoices } from "../src/db/schema";
import { guardDatabase } from "./guard";

async function main() {
  // Idempotent and correct against prod — it is meant to be run there once.
  // Banner only, so whoever runs it can see where they landed before it writes.
  await guardDatabase({ label: "Backfill invoice settlement status" });

  const all = await db
    .select({
      id: invoices.id,
      invoiceNo: invoices.invoiceNo,
      status: invoices.status,
      balanceDue: invoices.balanceDue,
    })
    .from(invoices);

  let settled = 0;
  let reopened = 0;
  let unchanged = 0;
  let skipped = 0;

  for (const inv of all) {
    if (inv.status === "cancelled") {
      skipped++;
      continue;
    }

    const [held] = await db
      .select({ n: count() })
      .from(invoiceDocuments)
      .where(
        and(
          eq(invoiceDocuments.invoiceId, inv.id),
          eq(invoiceDocuments.provided, true),
          ne(invoiceDocuments.custody, "given_to_customer"),
        ),
      );

    const complete = Number(inv.balanceDue) <= 0 && Number(held.n) === 0;
    const next = complete ? ("settled" as const) : ("active" as const);

    if (next === inv.status) {
      unchanged++;
      continue;
    }

    await db.update(invoices).set({ status: next }).where(eq(invoices.id, inv.id));
    if (next === "settled") {
      settled++;
      console.log(`  settled  ${inv.invoiceNo}`);
    } else {
      reopened++;
      console.log(`  reopened ${inv.invoiceNo} (balance ${inv.balanceDue}, ${held.n} document(s) still held)`);
    }
  }

  console.log(
    `\nBackfill complete: ${settled} settled, ${reopened} reopened, ${unchanged} already correct, ${skipped} cancelled (untouched). ${all.length} invoices scanned.`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
