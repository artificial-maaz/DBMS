/**
 * One-time (idempotent) seed: loads the real rate cards Sir provided
 * (United, Yadea, Ramza, Honda — w.e.f 2026-06-18) into installment_plans.
 * Run: npm run db:seed:plans   (after db:migrate)
 * Safe to re-run: existing (company, model) rows are updated in place, not duplicated.
 */
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { installmentPlans } from "../src/db/schema";
import { guardDatabase } from "./guard";

const CREATOR_EMAIL = process.env.SEED_CREATOR_EMAIL!;
const EFFECTIVE = "2026-06-18";

type Row = {
  company: string;
  model: string;
  cashPrice: string;
  advance: string;
  monthly3: string;
  total3: string;
  monthly6: string;
  total6: string;
  monthly9: string;
  total9: string;
  monthly12: string;
  total12: string;
};

const ROWS: Row[] = [
  // United
  { company: "United", model: "US 70", cashPrice: "114000", advance: "40000", monthly3: "28000", total3: "124000", monthly6: "17000", total6: "142000", monthly9: "12000", total9: "148000", monthly12: "9500", total12: "154000" },
  { company: "United", model: "Classy Pro", cashPrice: "155000", advance: "77900", monthly3: "29000", total3: "164900", monthly6: "17500", total6: "182900", monthly9: "12000", total9: "185900", monthly12: "9500", total12: "191900" },
  { company: "United", model: "Smart Pro", cashPrice: "172000", advance: "85900", monthly3: "32000", total3: "181900", monthly6: "18000", total6: "193900", monthly9: "13000", total9: "202900", monthly12: "10000", total12: "205900" },
  { company: "United", model: "Sharp Pro", cashPrice: "199000", advance: "98900", monthly3: "36500", total3: "208400", monthly6: "20000", total6: "218900", monthly9: "15500", total9: "238400", monthly12: "12000", total12: "242900" },
  // Yadea
  { company: "Yadea", model: "M3", cashPrice: "174000", advance: "87000", monthly3: "32000", total3: "183000", monthly6: "17500", total6: "192000", monthly9: "12500", total9: "199500", monthly12: "10500", total12: "213000" },
  { company: "Yadea", model: "Ruibin S", cashPrice: "193000", advance: "96500", monthly3: "35000", total3: "201500", monthly6: "19500", total6: "213500", monthly9: "14000", total9: "222500", monthly12: "11500", total12: "234500" },
  { company: "Yadea", model: "M3H", cashPrice: "255000", advance: "128000", monthly3: "47000", total3: "269000", monthly6: "26000", total6: "284000", monthly9: "18500", total9: "294500", monthly12: "15000", total12: "308000" },
  // Sir (2026-08-06): T5L repriced — cash 305,000, advance 160,000. Monthlies
  // unchanged, so each total = advance + (monthly x months).
  { company: "Yadea", model: "T5L", cashPrice: "305000", advance: "160000", monthly3: "52500", total3: "317500", monthly6: "28500", total6: "331000", monthly9: "21000", total9: "349000", monthly12: "17000", total12: "364000" },
  { company: "Yadea", model: "EPOCH", cashPrice: "355000", advance: "178000", monthly3: "60500", total3: "359500", monthly6: "35000", total6: "388000", monthly9: "25500", total9: "407500", monthly12: "21000", total12: "430000" },
  { company: "Yadea", model: "VELAX", cashPrice: "444000", advance: "222000", monthly3: "80500", total3: "463500", monthly6: "44000", total6: "486000", monthly9: "32000", total9: "510000", monthly12: "26000", total12: "534000" },
  { company: "Yadea", model: "KEINESS", cashPrice: "1400000", advance: "699000", monthly3: "255500", total3: "1465500", monthly6: "139500", total6: "1536000", monthly9: "100000", total9: "1599000", monthly12: "82500", total12: "1689000" },
  // Ramza
  { company: "Ramza", model: "Kuling", cashPrice: "155000", advance: "78000", monthly3: "28000", total3: "162000", monthly6: "15500", total6: "171000", monthly9: "11500", total9: "181500", monthly12: "9500", total12: "192000" },
  { company: "Ramza", model: "Linbo", cashPrice: "160000", advance: "80000", monthly3: "29000", total3: "167000", monthly6: "16000", total6: "176000", monthly9: "12000", total9: "188000", monthly12: "9500", total12: "194000" },
  { company: "Ramza", model: "Yaari Plus", cashPrice: "170000", advance: "85000", monthly3: "31000", total3: "178000", monthly6: "17000", total6: "187000", monthly9: "12500", total9: "197500", monthly12: "10000", total12: "205000" },
  { company: "Ramza", model: "Liberty", cashPrice: "185000", advance: "93000", monthly3: "33500", total3: "193500", monthly6: "18500", total6: "204500", monthly9: "13500", total9: "214500", monthly12: "11000", total12: "225000" },
  { company: "Ramza", model: "Liberty Ultra Lithium", cashPrice: "250000", advance: "125000", monthly3: "45500", total3: "261500", monthly6: "25000", total6: "275000", monthly9: "18000", total9: "287000", monthly12: "15000", total12: "305000" },
  { company: "Ramza", model: "S-75 Lithium", cashPrice: "305000", advance: "153000", monthly3: "55500", total3: "319500", monthly6: "30500", total6: "336000", monthly9: "22000", total9: "351000", monthly12: "18000", total12: "369000" },
  // Honda
  { company: "Honda", model: "CD-70", cashPrice: "160000", advance: "65000", monthly3: "35500", total3: "171500", monthly6: "19000", total6: "179000", monthly9: "13500", total9: "186500", monthly12: "11000", total12: "197000" },
  { company: "Honda", model: "Pridor 100", cashPrice: "212000", advance: "99900", monthly3: "42000", total3: "225900", monthly6: "22500", total6: "234900", monthly9: "16500", total9: "248400", monthly12: "13500", total12: "261900" },
  { company: "Honda", model: "CG-125", cashPrice: "238500", advance: "107500", monthly3: "48000", total3: "251500", monthly6: "26500", total6: "266500", monthly9: "19000", total9: "278500", monthly12: "15000", total12: "287500" },
];

async function main() {
  // Reference data, safe to run against prod - banner only.
  await guardDatabase({ label: "Seed the installment rate cards" });

  const creator = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, CREATOR_EMAIL) });
  if (!creator) throw new Error(`Creator (${CREATOR_EMAIL}) not found — run npm run db:seed first.`);

  let created = 0;
  let updated = 0;

  for (const row of ROWS) {
    const existing = await db.query.installmentPlans.findFirst({
      where: (p, { and, eq }) => and(eq(p.company, row.company), eq(p.model, row.model)),
    });

    if (existing) {
      await db.update(installmentPlans).set({ ...row, effectiveDate: EFFECTIVE }).where(eq(installmentPlans.id, existing.id));
      updated++;
    } else {
      await db.insert(installmentPlans).values({ ...row, effectiveDate: EFFECTIVE, createdBy: creator.id });
      created++;
    }
  }

  console.log(`✔ Installment plans seeded: ${created} created, ${updated} updated (${ROWS.length} total).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
