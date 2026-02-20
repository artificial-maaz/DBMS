/**
 * One-time (idempotent) seed: loads the real installment-sale checklist items
 * Sir confirmed (#20, 2026-07-06) into document_requirements.
 * Run: npm run db:seed:docs   (after db:migrate)
 * Safe to re-run: existing names are left untouched, not duplicated.
 */
import { db } from "../src/db";
import { documentRequirements } from "../src/db/schema";
import { guardDatabase } from "./guard";

const CREATOR_EMAIL = process.env.SEED_CREATOR_EMAIL!;

const NAMES = [
  "CNIC Copy",
  "Utility Bill",
  "Sale Letter / Agreement",
  "Form / Token Registration Papers",
  "Spare Key",
  "Tool Kit",
  "Warranty Card",
];

async function main() {
  // Reference data, safe to run against prod - banner only.
  await guardDatabase({ label: "Seed the document checklist" });

  const creator = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, CREATOR_EMAIL) });
  if (!creator) throw new Error(`Creator (${CREATOR_EMAIL}) not found — run npm run db:seed first.`);

  let created = 0;
  let skipped = 0;

  for (const name of NAMES) {
    const existing = await db.query.documentRequirements.findFirst({
      where: (r, { eq }) => eq(r.name, name),
    });
    if (existing) {
      skipped++;
      continue;
    }
    await db.insert(documentRequirements).values({ name, createdBy: creator.id });
    created++;
  }

  console.log(`✔ Document requirements seeded: ${created} created, ${skipped} already existed (${NAMES.length} total).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
