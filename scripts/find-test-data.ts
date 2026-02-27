/**
 * REPORT — what in this database looks like seeded test data.
 * Run: npm run db:find-test-data
 *
 * Deliberately READ-ONLY. It would be easy to write a `--purge` flag and much
 * harder to make it correct: the test sale posted to the ledger, updated the
 * P&L, consumed a vehicle, wrote installment schedules and left audit rows.
 * Deleting the vehicle without unwinding all of that leaves the books
 * inconsistent in a way nobody would notice until a month-end did not balance.
 *
 * So this tells Sir exactly what is there and where, and he decides. In
 * practice the right answer before go-live is usually a **fresh production
 * branch in Neon** rather than surgery on this one — see GOLIVE.md.
 *
 * Detection is by the markers the seeder actually uses (`scripts/seed-test-data.ts`):
 *   - branches named "Test Branch ..."
 *   - vehicles whose chassis number starts "TST"
 * Anything a human typed will not match, so a clean report is meaningful.
 */
import { count, eq, like, sql } from "drizzle-orm";
import { db } from "../src/db";
import {
  branches,
  customers,
  invoices,
  ledgerEntries,
  vehicles,
  visitors,
} from "../src/db/schema";
import { guardDatabase } from "./guard";

async function main() {
  const target = await guardDatabase({ label: "Report seeded test data (read-only)" });

  const testBranches = await db.select().from(branches).where(like(branches.name, "Test Branch%"));
  const testVehicles = await db.select().from(vehicles).where(like(vehicles.chassisNo, "TST%"));

  console.log(`  Test branches : ${testBranches.length}`);
  for (const b of testBranches) console.log(`      #${b.id}  ${b.name} (${b.city})`);

  console.log(`  Test vehicles : ${testVehicles.length}`);
  for (const v of testVehicles) {
    console.log(`      #${v.id}  ${v.make} ${v.model} — ${v.chassisNo} [${v.status}]`);
  }

  // Anything attached to a test branch is test data by association, even if it
  // was typed by hand while exploring.
  const branchIds = testBranches.map((b) => b.id);
  if (branchIds.length > 0) {
    const inTestBranches = sql`${branches.id} in ${branchIds}`;
    void inTestBranches; // documentation of intent; per-table filters below

    for (const [label, table, col] of [
      ["customers", customers, customers.branchId],
      ["visitors", visitors, visitors.branchId],
      ["invoices", invoices, invoices.branchId],
      ["ledger entries", ledgerEntries, ledgerEntries.branchId],
    ] as const) {
      let total = 0;
      for (const id of branchIds) {
        const [row] = await db.select({ n: count() }).from(table).where(eq(col, id));
        total += Number(row.n);
      }
      console.log(`  ${label.padEnd(14)}: ${total} attached to test branches`);
    }
  }

  const clean = testBranches.length === 0 && testVehicles.length === 0;
  console.log("");
  console.log(
    clean
      ? "  No seeded test data found. This database looks clean."
      : "  Seeded data present. Before go-live, see GOLIVE.md — the recommended route is a\n" +
        "  fresh production branch in Neon, NOT deleting these rows, because the test sale\n" +
        "  has already posted to the ledger and the P&L.",
  );
  if (target.isProd && !clean) {
    console.log("");
    console.log("  WARNING: this is the PRODUCTION database and it contains seeded test data.");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
