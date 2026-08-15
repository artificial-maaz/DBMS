/**
 * FULL RESET — wipe every operational record, keep the setup.
 *
 *   npx tsx --env-file=.env scripts/reset-to-fresh.ts          DRY RUN
 *   npx tsx --env-file=.env scripts/reset-to-fresh.ts --yes    Actually wipes
 *
 * WHY THIS EXISTS, SEPARATELY FROM db:purge-test (Sir, 2026-08-16):
 * the purge removes rows matching the SEEDER's markers — branches named
 * "Test Branch %", chassis starting "TST". It correctly left everything Sir had
 * entered by hand at his real branches (Head Office, YADEA) while learning the
 * system. Those are just as much rehearsal data, and there is no marker that
 * distinguishes them from tomorrow's real sale. So this script does not try to
 * be clever: it empties the operational tables completely.
 *
 * ---------------------------------------------------------------------------
 * KEPT — the setup you would otherwise spend an evening rebuilding:
 *   - the Creator account (and ONLY the Creator; every other login is removed)
 *   - System Settings: company name, logo, brand colour, fee defaults
 *   - Installment rate cards  (REAL pricing, seeded from Sir's own cards)
 *   - Document checklist, Handover checklist, Labor rates  (reference data)
 *
 * DELETED — everything the business will re-enter for real:
 *   branches, customers, visitors, vehicles, invoices and every child record,
 *   ledger entries, bookings, test drives, job cards, spare parts, deliveries,
 *   gate passes, purchase orders, suppliers, assets, payroll, approvals,
 *   audit log, and all non-Creator staff accounts.
 * ---------------------------------------------------------------------------
 *
 * The audit log IS cleared here, unlike in the purge. An audit trail exists to
 * make real operations accountable; carrying a rehearsal's history into day one
 * only makes the first real month harder to read.
 *
 * Runs in ONE transaction. If anything fails, nothing is deleted.
 */
import { eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "../src/db";
import {
  auditLog,
  bookings,
  branchAssets,
  branches,
  customers,
  gatePasses,
  guarantors,
  installmentSchedules,
  invoiceDocuments,
  invoiceHandovers,
  invoiceItems,
  invoices,
  jobCardParts,
  jobCards,
  ledgerEntries,
  partMovements,
  payrollRecords,
  pendingActions,
  purchaseOrderItems,
  purchaseOrders,
  spareParts,
  staffProfiles,
  stockDeliveries,
  suppliers,
  testDrives,
  user,
  vehicles,
  visitors,
} from "../src/db/schema";
import { guardDatabase } from "./guard";

const APPLY = process.argv.includes("--yes") || process.env.RESET_CONFIRM === "yes";

async function main() {
  await guardDatabase({
    label: APPLY ? "FULL RESET — wipe all operational data (WRITES)" : "Full reset — DRY RUN",
  });

  const creatorEmail = (process.env.SEED_CREATOR_EMAIL ?? "").trim().toLowerCase();
  if (!creatorEmail) {
    console.log("  STOP: SEED_CREATOR_EMAIL is not set in .env.");
    console.log("  Without it this script cannot tell which account to keep. Aborting.\n");
    process.exit(1);
  }

  // Who survives. Belt and braces: matched by role OR by the .env email, so a
  // typo in one of them cannot leave Sir locked out of his own system.
  const keepRows = await db
    .select({ userId: staffProfiles.userId, email: user.email, role: staffProfiles.role })
    .from(staffProfiles)
    .innerJoin(user, eq(staffProfiles.userId, user.id));

  const keep = keepRows.filter((r) => r.role === "creator" || r.email.trim().toLowerCase() === creatorEmail);
  const remove = keepRows.filter((r) => !keep.some((k) => k.userId === r.userId));

  if (keep.length === 0) {
    console.log(`  STOP: no creator account found (looked for role 'creator' or ${creatorEmail}).`);
    console.log("  Refusing to wipe a database that would leave nobody able to sign in.\n");
    process.exit(1);
  }

  console.log("  KEEPING");
  for (const k of keep) console.log(`      ${k.email} (${k.role})`);
  console.log("  REMOVING");
  if (remove.length === 0) console.log("      no other staff accounts");
  for (const r of remove) console.log(`      ${r.email} (${r.role})`);
  console.log("");

  const keepIds = keep.map((k) => k.userId);

  // Order matters: children before parents. Postgres enforces it anyway — a
  // mistake here fails loudly and rolls back rather than corrupting anything.
  const plan: { label: string; run: (tx: typeof db) => Promise<unknown>; table: unknown }[] = [
    { label: "invoice handovers", table: invoiceHandovers, run: (tx) => tx.delete(invoiceHandovers) },
    { label: "invoice documents", table: invoiceDocuments, run: (tx) => tx.delete(invoiceDocuments) },
    { label: "guarantors", table: guarantors, run: (tx) => tx.delete(guarantors) },
    { label: "installment schedules", table: installmentSchedules, run: (tx) => tx.delete(installmentSchedules) },
    { label: "invoice line items", table: invoiceItems, run: (tx) => tx.delete(invoiceItems) },
    { label: "job card parts", table: jobCardParts, run: (tx) => tx.delete(jobCardParts) },
    { label: "job cards", table: jobCards, run: (tx) => tx.delete(jobCards) },
    { label: "part movements", table: partMovements, run: (tx) => tx.delete(partMovements) },
    { label: "purchase order lines", table: purchaseOrderItems, run: (tx) => tx.delete(purchaseOrderItems) },
    { label: "ledger entries", table: ledgerEntries, run: (tx) => tx.delete(ledgerEntries) },
    { label: "bookings", table: bookings, run: (tx) => tx.delete(bookings) },
    { label: "test drives", table: testDrives, run: (tx) => tx.delete(testDrives) },
    { label: "invoices", table: invoices, run: (tx) => tx.delete(invoices) },
    { label: "gate passes", table: gatePasses, run: (tx) => tx.delete(gatePasses) },
    { label: "vehicles", table: vehicles, run: (tx) => tx.delete(vehicles) },
    { label: "stock deliveries", table: stockDeliveries, run: (tx) => tx.delete(stockDeliveries) },
    { label: "spare parts", table: spareParts, run: (tx) => tx.delete(spareParts) },
    { label: "purchase orders", table: purchaseOrders, run: (tx) => tx.delete(purchaseOrders) },
    { label: "suppliers", table: suppliers, run: (tx) => tx.delete(suppliers) },
    { label: "branch assets", table: branchAssets, run: (tx) => tx.delete(branchAssets) },
    { label: "visitors", table: visitors, run: (tx) => tx.delete(visitors) },
    { label: "customers", table: customers, run: (tx) => tx.delete(customers) },
    { label: "payroll records", table: payrollRecords, run: (tx) => tx.delete(payrollRecords) },
    { label: "pending approvals", table: pendingActions, run: (tx) => tx.delete(pendingActions) },
    { label: "audit log", table: auditLog, run: (tx) => tx.delete(auditLog) },
    {
      label: "staff accounts (all except the Creator)",
      table: staffProfiles,
      run: async (tx) => {
        await tx.delete(staffProfiles).where(sql`${staffProfiles.userId} not in ${keepIds}`);
        // Cascades to session / account / member.
        await tx.delete(user).where(sql`${user.id} not in ${keepIds}`);
      },
    },
    {
      label: "branches",
      table: branches,
      run: async (tx) => {
        // The Creator is branchless, so nothing should be pointing here — but
        // detach defensively rather than let one stale row abort the reset.
        await tx.update(staffProfiles).set({ branchId: null }).where(inArray(staffProfiles.userId, keepIds));
        await tx.delete(branches);
      },
    },
  ];

  console.log("  Rows that will be deleted:\n");
  let total = 0;
  for (const step of plan) {
    const rows = (await db
      .select({ n: sql<number>`count(*)::int` })
      .from(step.table as never)) as unknown as { n: number }[];
    let n = Number(rows[0]?.n ?? 0);
    if (step.label.startsWith("staff accounts")) n = remove.length;
    total += n;
    if (n > 0) console.log(`    ${String(n).padStart(5)}  ${step.label}`);
  }
  console.log(`\n    ${String(total).padStart(5)}  TOTAL\n`);

  console.log("  KEPT: Creator account, System Settings, installment rate cards,");
  console.log("        document checklist, handover checklist, labor rates.\n");

  if (!APPLY) {
    console.log("  ============================================================");
    console.log("  DRY RUN — NOTHING WAS DELETED. The database is unchanged.");
    console.log("  ============================================================");
    console.log("  To APPLY:");
    console.log("      npx tsx --env-file=.env scripts/reset-to-fresh.ts --yes\n");
    process.exit(0);
  }

  await db.transaction(async (tx) => {
    for (const step of plan) await step.run(tx as unknown as typeof db);
  });

  console.log("  Done. The database is now empty of operational data.");
  console.log("  Next: create the real branches, check System Settings, then onboard staff.\n");
  process.exit(0);
}

main().catch((e) => {
  console.error("\n  FAILED — nothing was committed. Error:\n ", e instanceof Error ? e.message : e, "\n");
  process.exit(1);
});
