/**
 * PURGE SEEDED TEST DATA — the careful version.
 *
 *   npm run db:purge-test            DRY RUN. Counts everything, deletes nothing.
 *   npm run db:purge-test -- --yes   Actually deletes, inside ONE transaction.
 *
 * Sir chose (2026-08-16) to clean the existing production database rather than
 * start on a fresh Neon branch. He was told the risk and took it, so this is
 * written to make that choice as safe as it can be:
 *
 *   - DRY RUN BY DEFAULT. You see the exact row counts before anything moves.
 *   - ONE TRANSACTION. If any step fails, the whole purge rolls back — the
 *     database is never left half-cleaned, which is the outcome that would
 *     genuinely hurt.
 *   - DELETION ORDER IS FOREIGN-KEY SAFE, children before parents. A wrong
 *     order does not corrupt anything; Postgres refuses and we roll back.
 *
 * WHY THIS IS THE RISKY PATH (worth understanding before typing --yes):
 * the seeded sale ran through the real service layer. It posted cash to the
 * ledger, recognised COGS in the P&L, consumed a vehicle and wrote an
 * installment schedule. Deleting those rows is correct ONLY because we delete
 * the ledger entries with them. If any real record has since been attached to a
 * test branch, it will be counted below — read the dry run, do not skim it.
 *
 * WHAT COUNTS AS TEST DATA (markers the seeder actually uses):
 *   - branches named "Test Branch %"
 *   - vehicles with a chassis number starting "TST"
 *   - anything belonging to those branches
 *
 * Audit log rows are deliberately NOT deleted. The audit trail is append-only
 * by design; it records that these things once existed and were removed, which
 * is exactly what an audit trail is for.
 */
import { and, eq, inArray, like, or, sql } from "drizzle-orm";
import { db } from "../src/db";
import {
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
  pendingActions,
  purchaseOrderItems,
  purchaseOrders,
  spareParts,
  payrollRecords,
  staffProfiles,
  stockDeliveries,
  testDrives,
  vehicles,
  visitors,
  auditLog,
  user,
} from "../src/db/schema";
import { guardDatabase } from "./guard";

/**
 * `npm run db:purge-test --yes` does NOT reach here: npm treats `--yes` as its
 * own flag and never forwards it, so the script quietly ran as a dry run and
 * looked like it had done nothing wrong (Sir hit this 2026-08-16). npm sets
 * `npm_config_yes` in that case, so honour it too - and the unambiguous form is
 * to skip npm entirely:
 *
 *     npx tsx --env-file=.env scripts/purge-test-data.ts --yes
 */
const APPLY =
  process.argv.includes("--yes") ||
  process.env.npm_config_yes === "true" ||
  process.env.PURGE_CONFIRM === "yes";

async function main() {
  await guardDatabase({ label: APPLY ? "PURGE seeded test data (WRITES)" : "Purge test data — DRY RUN" });

  // ---- Identify ----------------------------------------------------------
  const testBranches = await db.select().from(branches).where(like(branches.name, "Test Branch%"));
  const branchIds = testBranches.map((b) => b.id);

  const testVehicles = await db
    .select({ id: vehicles.id, chassisNo: vehicles.chassisNo, make: vehicles.make, model: vehicles.model })
    .from(vehicles)
    .where(
      branchIds.length
        ? or(like(vehicles.chassisNo, "TST%"), inArray(vehicles.branchId, branchIds))
        : like(vehicles.chassisNo, "TST%"),
    );
  const vehicleIds = testVehicles.map((v) => v.id);

  if (branchIds.length === 0 && vehicleIds.length === 0) {
    console.log("  Nothing matches the test-data markers. This database is already clean.\n");
    process.exit(0);
  }

  console.log(`  Test branches : ${testBranches.map((b) => b.name).join(", ") || "none"}`);
  console.log(`  Test vehicles : ${testVehicles.length}\n`);

  /**
   * IDENTIFY, in dependency order (rewritten 2026-08-16 after two failed runs).
   *
   * Branch membership alone is not enough. The seeder deliberately exercises
   * cross-branch behaviour, so a booking, invoice, job card or converted
   * visitor can sit at a REAL branch while pointing at a TEST customer. Sweep
   * only by branch and those rows survive — then Postgres refuses to delete the
   * customer they hold, and the whole transaction rolls back.
   *
   * The rule that actually works: if a row POINTS AT test data, it IS test
   * data, wherever it lives. So customers and visitors are resolved FIRST, and
   * everything downstream is matched against them as well as against the branch.
   */
  const customerRows = branchIds.length
    ? await db.select({ id: customers.id }).from(customers).where(inArray(customers.branchId, branchIds))
    : [];
  const customerIds = customerRows.map((r) => r.id);

  const visitorRows = branchIds.length
    ? await db.select({ id: visitors.id }).from(visitors).where(inArray(visitors.branchId, branchIds))
    : [];
  const visitorIds = visitorRows.map((r) => r.id);

  // Invoices: at a test branch, OR selling a test vehicle, OR sold to a test customer.
  const invRows = await db
    .selectDistinct({ id: invoices.id })
    .from(invoices)
    .leftJoin(invoiceItems, eq(invoiceItems.invoiceId, invoices.id))
    .where(
      or(
        branchIds.length ? inArray(invoices.branchId, branchIds) : sql`false`,
        vehicleIds.length ? inArray(invoiceItems.vehicleId, vehicleIds) : sql`false`,
        customerIds.length ? inArray(invoices.customerId, customerIds) : sql`false`,
      ),
    );
  const invoiceIds = invRows.map((r) => r.id);

  const jobRows = await db
    .select({ id: jobCards.id })
    .from(jobCards)
    .where(
      or(
        branchIds.length ? inArray(jobCards.branchId, branchIds) : sql`false`,
        customerIds.length ? inArray(jobCards.customerId, customerIds) : sql`false`,
        vehicleIds.length ? inArray(jobCards.vehicleId, vehicleIds) : sql`false`,
      ),
    );
  const jobIds = jobRows.map((r) => r.id);

  const partRows = branchIds.length
    ? await db.select({ id: spareParts.id }).from(spareParts).where(inArray(spareParts.branchId, branchIds))
    : [];
  const partIds = partRows.map((r) => r.id);

  const poRows = branchIds.length
    ? await db.select({ id: purchaseOrders.id }).from(purchaseOrders).where(inArray(purchaseOrders.branchId, branchIds))
    : [];
  const poIds = poRows.map((r) => r.id);

  // ---- Plan: children first, parents last -------------------------------
  const byBranch = <T extends { branchId: unknown }>(t: T) =>
    branchIds.length ? inArray(t.branchId as never, branchIds) : sql`false`;

  const steps: { label: string; run: (tx: typeof db) => Promise<unknown>; count: () => Promise<number> }[] = [];

  const add = (
    label: string,
    table: Parameters<typeof db.delete>[0],
    where: ReturnType<typeof eq> | ReturnType<typeof sql>,
  ) => {
    steps.push({
      label,
      run: (tx) => tx.delete(table).where(where),
      count: async () => {
        // Drizzle cannot infer a row type across a union of tables, so the
        // result is cast. The QUERY is still fully typed and parameterised —
        // only the shape of the returned row is asserted.
        const rows = (await db
          .select({ n: sql<number>`count(*)::int` })
          .from(table as never)
          .where(where as never)) as unknown as { n: number }[];
        return Number(rows[0]?.n ?? 0);
      },
    });
  };

  if (invoiceIds.length) {
    add("invoice handovers", invoiceHandovers, inArray(invoiceHandovers.invoiceId, invoiceIds));
    add("invoice documents", invoiceDocuments, inArray(invoiceDocuments.invoiceId, invoiceIds));
    add("guarantors", guarantors, inArray(guarantors.invoiceId, invoiceIds));
    add("installment schedules", installmentSchedules, inArray(installmentSchedules.invoiceId, invoiceIds));
    add("invoice line items", invoiceItems, inArray(invoiceItems.invoiceId, invoiceIds));
  }
  if (jobIds.length) add("job card parts", jobCardParts, inArray(jobCardParts.jobCardId, jobIds));
  if (jobIds.length) add("job cards", jobCards, inArray(jobCards.id, jobIds));
  if (partIds.length) add("part movements", partMovements, inArray(partMovements.partId, partIds));
  if (poIds.length) add("purchase order lines", purchaseOrderItems, inArray(purchaseOrderItems.poId, poIds));

  // Ledger: entries tied to a test invoice, plus everything booked at a test branch.
  add(
    "ledger entries",
    ledgerEntries,
    or(
      invoiceIds.length ? inArray(ledgerEntries.invoiceId, invoiceIds) : sql`false`,
      byBranch(ledgerEntries),
    )!,
  );

  add(
    "bookings",
    bookings,
    or(
      byBranch(bookings),
      customerIds.length ? inArray(bookings.customerId, customerIds) : sql`false`,
      visitorIds.length ? inArray(bookings.visitorId, visitorIds) : sql`false`,
    )!,
  );
  if (invoiceIds.length) add("invoices", invoices, inArray(invoices.id, invoiceIds));
  add(
    "test drives",
    testDrives,
    or(
      byBranch(testDrives),
      customerIds.length ? inArray(testDrives.customerId, customerIds) : sql`false`,
      visitorIds.length ? inArray(testDrives.visitorId, visitorIds) : sql`false`,
    )!,
  );
  if (vehicleIds.length) add("vehicles", vehicles, inArray(vehicles.id, vehicleIds));
  add("stock deliveries", stockDeliveries, byBranch(stockDeliveries));
  add("spare parts", spareParts, byBranch(spareParts));
  add("gate passes (from)", gatePasses, byBranch({ branchId: gatePasses.sourceBranchId }));
  add("gate passes (to)", gatePasses, byBranch({ branchId: gatePasses.destBranchId }));
  if (poIds.length) add("purchase orders", purchaseOrders, inArray(purchaseOrders.id, poIds));
  add("branch assets", branchAssets, byBranch(branchAssets));
  add(
    "visitors",
    visitors,
    or(
      byBranch(visitors),
      // A visitor converted INTO a test customer holds a reference to it.
      customerIds.length ? inArray(visitors.convertedCustomerId, customerIds) : sql`false`,
    )!,
  );
  add("customers", customers, customerIds.length ? inArray(customers.id, customerIds) : sql`false`);
  add("pending approvals", pendingActions, byBranch(pendingActions));
  add("branches", branches, branchIds.length ? inArray(branches.id, branchIds) : sql`false`);

  // ---- Report ------------------------------------------------------------
  console.log("  Rows that will be deleted:\n");
  let total = 0;
  for (const s of steps) {
    const n = await s.count();
    total += n;
    if (n > 0) console.log(`    ${String(n).padStart(5)}  ${s.label}`);
  }
  console.log(`\n    ${String(total).padStart(5)}  TOTAL\n`);

  /**
   * Staff attached to a test branch (Sir, 2026-08-16: "delete the staff as well
   * and just keep me as creator").
   *
   * THE CREATOR IS EXCLUDED TWICE - by role and by email. A purge script that
   * can delete the only account able to run it is a script that will eventually
   * do exactly that.
   *
   * Deleting the `user` row cascades to session, account and member (all
   * declared onDelete: "cascade"), so a removed employee cannot survive on a
   * live cookie. `payroll_records` and `audit_log` reference the user by plain
   * text with no FK, so they are removed explicitly - these people only ever
   * acted on test data, and leaving their audit rows behind would mean entries
   * the Audit Log silently hides (it inner-joins on user) while they sit in the
   * table forever.
   */
  const creatorEmail = (process.env.SEED_CREATOR_EMAIL ?? "").trim().toLowerCase();
  const staffAtTestBranches = branchIds.length
    ? await db
        .select({ id: staffProfiles.id, userId: staffProfiles.userId, role: staffProfiles.role, email: user.email })
        .from(staffProfiles)
        .innerJoin(user, eq(staffProfiles.userId, user.id))
        .where(inArray(staffProfiles.branchId, branchIds))
    : [];

  const doomed = staffAtTestBranches.filter(
    (p) => p.role !== "creator" && p.email.trim().toLowerCase() !== creatorEmail,
  );
  const spared = staffAtTestBranches.length - doomed.length;

  if (staffAtTestBranches.length > 0) {
    console.log(`  Staff accounts at test branches: ${staffAtTestBranches.length}`);
    for (const p of doomed) console.log(`      DELETE  ${p.email} (${p.role})`);
    if (spared > 0) console.log(`      KEEP    ${spared} creator account(s) - never deleted`);
    console.log("");
  }

  const doomedIds = doomed.map((d) => d.userId);
  if (doomedIds.length > 0) {
    steps.unshift({
      label: "staff accounts (+ sessions, payroll, audit rows)",
      run: async (tx) => {
        await tx.delete(payrollRecords).where(inArray(payrollRecords.userId, doomedIds));
        await tx.delete(auditLog).where(inArray(auditLog.userId, doomedIds));
        await tx.delete(staffProfiles).where(inArray(staffProfiles.userId, doomedIds));
        await tx.delete(user).where(inArray(user.id, doomedIds)); // cascades to session/account/member
      },
      count: async () => doomedIds.length,
    });
    console.log(`  (+ ${doomedIds.length} staff account(s) listed above)\n`);
  }

  if (!APPLY) {
    console.log("  ============================================================");
    console.log("  DRY RUN — NOTHING WAS DELETED. The database is unchanged.");
    console.log("  ============================================================");
    console.log("  Read the list above. If it contains anything real, STOP and tell Claude.");
    console.log("  To APPLY (note the DOUBLE dash, npm eats a single one):");
    console.log("      npm run db:purge-test -- --yes");
    console.log("  or, unambiguously:");
    console.log("      npx tsx --env-file=.env scripts/purge-test-data.ts --yes\n");
    process.exit(0);
  }

  // ---- Apply, all or nothing --------------------------------------------
  await db.transaction(async (tx) => {
    for (const s of steps) await s.run(tx as unknown as typeof db);
  });

  console.log("  Done. All of the above was deleted in a single transaction.");
  console.log("  Audit log entries were intentionally kept — they record that this happened.\n");
  process.exit(0);
}

main().catch((e) => {
  console.error("\n  FAILED — nothing was committed. Error:\n ", e instanceof Error ? e.message : e, "\n");
  process.exit(1);
});
