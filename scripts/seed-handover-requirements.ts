/**
 * One-time (idempotent) seed: the physical handover checklist (#13).
 * Run: npm run db:seed:handover   (after db:migrate)
 * Safe to re-run: existing names are left untouched, not duplicated.
 *
 * The first eight are Sir's own list from the 31-point review. The last five he
 * approved on 2026-08-09 as additions.
 *
 * NOTE: "Spare Key" and "Tool Kit" also exist in `document_requirements`. On an
 * installment sale both checklists will therefore show them. That is Sir's call
 * to resolve in the UI (retire either entry — both lists are manageable), not
 * something to silently drop here.
 */
import { db } from "../src/db";
import { handoverRequirements } from "../src/db/schema";

const CREATOR_EMAIL = process.env.SEED_CREATOR_EMAIL!;

const NAMES = [
  // Sir's original eight (31-point review)
  "Motor Charger",
  "Charger Lead / Adaptor",
  "Chassis Holder",
  "Side Mirrors",
  "1 Litre Petrol (fuel) / Sufficient Charge (EV)",
  "Vehicle Scratchless & Undamaged",
  "Customer Photo Taken",
  "Google Review Requested",
  // Approved additions (2026-08-09)
  "Number Plate / Registration File Handed",
  "Spare Key",
  "Tool Kit",
  "Owner's Manual",
  "Helmet (if bundled)",
];

async function main() {
  const creator = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, CREATOR_EMAIL) });
  if (!creator) throw new Error(`Creator (${CREATOR_EMAIL}) not found — run npm run db:seed first.`);

  let created = 0;
  let skipped = 0;

  for (const name of NAMES) {
    const existing = await db.query.handoverRequirements.findFirst({
      where: (r, { eq }) => eq(r.name, name),
    });
    if (existing) {
      skipped++;
      continue;
    }
    await db.insert(handoverRequirements).values({ name, createdBy: creator.id });
    created++;
  }

  console.log(`✔ Handover checklist seeded: ${created} created, ${skipped} already existed (${NAMES.length} total).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
