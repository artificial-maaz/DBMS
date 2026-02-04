/**
 * One-time seed: creates the Creator account (Sir) + head-office branch.
 * Run: npm run db:seed   (after db:migrate)
 *
 * Uses a local betterAuth instance WITH sign-up enabled — the app's own
 * config keeps public sign-up disabled; this bypass exists only here,
 * runs only from Sir's machine, and is idempotent (safe to re-run).
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { branches, staffProfiles } from "../src/db/schema";
import { guardDatabase } from "./guard";

const email = process.env.SEED_CREATOR_EMAIL!;
const password = process.env.SEED_CREATOR_PASSWORD!;
const name = process.env.SEED_CREATOR_NAME ?? "Creator";

async function main() {
  if (!email || !password) throw new Error("Set SEED_CREATOR_EMAIL / SEED_CREATOR_PASSWORD in .env");

  // Destructive: if the Creator already exists this RESETS the password to
  // whatever is in .env. That is exactly what makes it the recovery tool, and
  // exactly why it must not fire at production by accident.
  await guardDatabase({ label: "Seed / repair the Creator account", destructive: true });

  const seedAuth = betterAuth({
    database: drizzleAdapter(db, { provider: "pg" }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: { enabled: true }, // sign-up allowed only inside this script
    plugins: [organization()],
  });

  // 1. Creator user (create, or reset password to the .env value if exists)
  const existing = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, email) });
  let userId: string;
  if (existing) {
    userId = existing.id;
    const ctx = await seedAuth.$context;
    const hash = await ctx.password.hash(password);
    await ctx.internalAdapter.updatePassword(userId, hash);
    console.log("Creator user exists — password reset to SEED_CREATOR_PASSWORD from .env.");
  } else {
    const res = await seedAuth.api.signUpEmail({ body: { email, password, name } });
    userId = res.user.id;
    console.log("Creator user created:", email);
  }

  // 2. Head-office branch (skip if exists)
  let branch = await db.query.branches.findFirst({ where: (b, { eq }) => eq(b.name, "Head Office") });
  if (!branch) {
    [branch] = await db.insert(branches).values({ name: "Head Office", city: "Lahore" }).returning();
    console.log("Branch created: Head Office");
  }

  // 3. Creator staff profile (branchId null = all-branch scope)
  const profile = await db.query.staffProfiles.findFirst({
    where: (p, { eq }) => eq(p.userId, userId),
  });
  if (!profile) {
    await db.insert(staffProfiles).values({ userId, role: "creator", designation: "Creator" });
    console.log("Creator staff profile created (role: creator, all-branch scope).");
  }

  console.log("✔ Seed complete. You can now log in.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
