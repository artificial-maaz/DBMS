/**
 * Is PRODUCTION actually on the latest schema?
 *
 *     npm run db:check-prod
 *
 * After the dev/prod split there are two databases, and the dangerous state is
 * code deployed to production that expects a column only dev has. Drizzle has no
 * "status" command, and a failed migrate can look identical to a cold-start
 * timeout — Neon suspends idle computes, so the first connection often dies and
 * the second succeeds.
 *
 * So this asks production directly, read-only: does it have the columns the
 * current code needs? Cheap to run, and worth running after every deploy that
 * carried a migration.
 *
 * Add a line to REQUIRED whenever a migration adds something the app would
 * crash without.
 */
import postgres from "postgres";

/** table -> columns the running code assumes exist. */
const REQUIRED: Record<string, string[]> = {
  invoice_items: ["part_id", "qty"], // parts sold on an invoice (0023)
  invoice_handovers: ["handed_over", "note"], // handover checklist (#13)
  handover_requirements: ["name", "is_active"],
  invoices: ["sale_date", "warranty_card_sent"],
};

async function main() {
  const url = process.env.PROD_DATABASE_URL;
  if (!url) {
    console.error("\n  PROD_DATABASE_URL is not set in .env.\n");
    process.exit(1);
  }

  const host = new URL(url).hostname;
  console.log("");
  console.log("  ------------------------------------------------------------");
  console.log("  Checking PRODUCTION schema");
  console.log(`  host : ${host}`);
  console.log("  ------------------------------------------------------------\n");

  const sql = postgres(url, { prepare: false });
  let missing = 0;

  try {
    for (const [table, columns] of Object.entries(REQUIRED)) {
      const rows = await sql<{ column_name: string }[]>`
        select column_name from information_schema.columns where table_name = ${table}
      `;
      const have = new Set(rows.map((r) => r.column_name));

      if (rows.length === 0) {
        console.log(`  MISSING TABLE  ${table}`);
        missing += columns.length;
        continue;
      }
      for (const c of columns) {
        if (have.has(c)) {
          console.log(`  ok             ${table}.${c}`);
        } else {
          console.log(`  MISSING        ${table}.${c}`);
          missing++;
        }
      }
    }
  } finally {
    await sql.end();
  }

  console.log("");
  if (missing === 0) {
    console.log("  Production is up to date. Safe to deploy.\n");
    process.exit(0);
  }
  console.log(`  ${missing} thing(s) missing. Run:  npm run db:migrate:prod`);
  console.log("  If that times out, run it again - Neon suspends idle computes and");
  console.log("  the first connection after a quiet spell often dies on wake.\n");
  process.exit(1);
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("\n  FAILED:", msg);

  // Two very different failures used to print the same unhelpful hint. They
  // need opposite responses, so tell them apart rather than guessing.
  if (/password authentication failed|SASL|role .* does not exist/i.test(msg)) {
    console.error("");
    console.error("  This is a CREDENTIALS problem, not a sleeping database.");
    console.error("  PROD_DATABASE_URL in .env has the wrong password for that branch.");
    console.error("  Neon issues a separate connection string per branch, and the password");
    console.error("  is only shown when you reveal it - a half-copied string looks valid.");
    console.error("");
    console.error("  FIX: Neon console -> your PRODUCTION branch -> Connect ->");
    console.error("       reveal the password, copy the WHOLE string, replace");
    console.error("       PROD_DATABASE_URL in .env with it.\n");
  } else if (/timed? ?out|ETIMEDOUT|ECONNREFUSED/i.test(msg)) {
    console.error("  Neon suspends idle computes; the first connection after a quiet");
    console.error("  spell often dies while it wakes. Run this again.\n");
  } else {
    console.error("");
  }
  process.exit(1);
});
