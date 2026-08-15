/**
 * Apply pending migrations to PRODUCTION.
 *
 *     npm run db:migrate:prod
 *
 * After the dev/prod split, `DATABASE_URL` points at the DEV Neon branch, so a
 * plain `npm run db:migrate` only ever touches dev. Production then runs code
 * expecting columns that were never created there — which surfaces as a crash
 * on the first page that reads them, in front of whoever is using it.
 *
 * This reads `PROD_DATABASE_URL` from .env and runs drizzle-kit against that
 * one database, for one command. Nothing is edited, so nothing can be left
 * pointing the wrong way afterwards.
 *
 * It prints the host first and asks you to confirm, because "migrate
 * production" should never be a keystroke you make by accident.
 */
import { execSync } from "node:child_process";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

async function main() {
  const url = process.env.PROD_DATABASE_URL;
  if (!url) {
    console.error("\n  PROD_DATABASE_URL is not set in .env.");
    console.error("  Add it — the connection string of your PRODUCTION Neon branch.\n");
    process.exit(1);
  }

  const host = new URL(url).hostname; // never print credentials
  console.log("");
  console.log("  ------------------------------------------------------------");
  console.log("  Applying migrations to PRODUCTION");
  console.log(`  host : ${host}`);
  console.log("  ------------------------------------------------------------");

  if (stdin.isTTY) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const answer = await rl.question("  Type 'migrate' to continue: ");
    rl.close();
    if (answer.trim() !== "migrate") {
      console.log("  Aborted — nothing was applied.\n");
      process.exit(0);
    }
  }

  execSync("npx drizzle-kit migrate", {
    stdio: "inherit",
    env: { ...process.env, TARGET_DATABASE_URL: url },
  });
  console.log("\n  Production migrated.\n");
}

main().catch((e) => {
  console.error("\n  FAILED:", e instanceof Error ? e.message : e, "\n");
  process.exit(1);
});
