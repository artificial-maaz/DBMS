/**
 * SAFETY GATE FOR EVERY SCRIPT THAT WRITES TO THE DATABASE.
 *
 * Why this exists (Sir, 2026-08-09): dev and production shared one Neon
 * database for the whole build, and the seed scripts take whatever
 * `DATABASE_URL` happens to be in `.env`. That was harmless while every record
 * was placeholder. With real staff and real sales weeks away it stops being
 * harmless, because two of those scripts are genuinely destructive:
 *
 *   - `db:seed`      resets the Creator's password to the .env value
 *   - `db:seed:test` injects fake branches, vehicles and SALES through the real
 *                    service layer, so they post to the ledger and the P&L
 *
 * Neither prints which database it is about to touch. Run one against prod by
 * accident, with the wrong line in `.env`, and the damage is in the books.
 *
 * The gate does three things:
 *   1. Always names the target host and database before anything runs.
 *   2. Refuses outright when a fake-data script is aimed at production.
 *   3. Demands the database name be typed by hand for anything else
 *      destructive against production, and refuses entirely when there is no
 *      terminal to ask (cron, CI, a Railway shell).
 *
 * Production is identified by `PROD_DB_HOST` (the Neon hostname of the prod
 * branch) or `APP_ENV=production`. If neither is set the gate says so loudly
 * rather than assuming safety — an unconfigured guard must never read as "this
 * is definitely dev".
 *
 * The connection password is never read, logged, or included in any message.
 */
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

export type Target = {
  host: string;
  database: string;
  isProd: boolean;
  /** True when neither PROD_DB_HOST nor APP_ENV is configured. */
  unknown: boolean;
};

export function describeTarget(): Target {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set — check your .env file.");

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("DATABASE_URL is not a valid connection string.");
  }

  const host = url.hostname;
  const database = url.pathname.replace(/^\//, "") || "(default)";
  const prodHost = process.env.PROD_DB_HOST?.trim();
  const declared = process.env.APP_ENV?.trim().toLowerCase();

  const unknown = !prodHost && !declared;
  const isProd = declared === "production" || (!!prodHost && host === prodHost);

  return { host, database, isProd, unknown };
}

function banner(target: Target, label: string) {
  const where = target.isProd ? "PRODUCTION" : target.unknown ? "UNIDENTIFIED" : "development";
  console.log("");
  console.log("  ------------------------------------------------------------");
  console.log(`  ${label}`);
  console.log(`  target : ${where}`);
  console.log(`  host   : ${target.host}`);
  console.log(`  db     : ${target.database}`);
  console.log("  ------------------------------------------------------------");
  console.log("");
}

async function confirmByTyping(expected: string) {
  if (!stdin.isTTY) {
    throw new Error(
      "Refusing to touch production from a non-interactive shell. Run this from your own terminal if you really mean it.",
    );
  }
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(`  Type the database name (${expected}) to continue, or anything else to abort: `);
  rl.close();
  if (answer.trim() !== expected) {
    throw new Error("Aborted — nothing was written.");
  }
}

/**
 * Call at the top of every script that writes.
 *
 * @param label       what the script does, shown in the banner
 * @param fakeData    true for scripts that invent records (seed-test-data).
 *                    These are refused against production outright — there is
 *                    no legitimate reason to put "Test Branch Lahore" into a
 *                    live dealership, so no confirmation prompt is offered.
 * @param destructive true for scripts that overwrite existing rows
 *                    (seed.ts resets a password). Prompts on production.
 *                    Idempotent upserts leave this false — they only need the
 *                    banner, so an operator can see where they landed.
 */
export async function guardDatabase(opts: {
  label: string;
  fakeData?: boolean;
  destructive?: boolean;
}): Promise<Target> {
  const target = describeTarget();
  banner(target, opts.label);

  if (target.unknown) {
    console.log("  NOTE: neither PROD_DB_HOST nor APP_ENV is set, so this script");
    console.log("        cannot tell dev from production. Set PROD_DB_HOST in .env");
    console.log("        to the Neon hostname of your production branch.");
    console.log("");
  }

  if (target.isProd && opts.fakeData) {
    throw new Error(
      "Refusing to seed TEST DATA into production. Point DATABASE_URL at your dev branch and try again.",
    );
  }

  if (target.isProd && opts.destructive) {
    console.log("  This script OVERWRITES existing data on the production database.");
    await confirmByTyping(target.database);
  }

  return target;
}
