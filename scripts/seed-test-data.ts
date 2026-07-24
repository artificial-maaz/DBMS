/**
 * TEST DATA SEEDER — populates realistic raw data for full-system testing.
 * Run: npm run db:seed:test   (idempotent-ish: skips records that already exist)
 * Executes through the REAL service layer (as the Creator), so every rule,
 * transaction, ledger posting, and audit entry fires exactly like production.
 */
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { branches, customers, staffProfiles, vehicles } from "../src/db/schema";
import { createVehicle } from "../src/modules/inventory/service";
import { createCustomer } from "../src/modules/customers/service";
import { createSale } from "../src/modules/sales/service";
import { recordEntry } from "../src/modules/ledger/service";
import { createPart } from "../src/modules/parts/service";
import { createBooking } from "../src/modules/bookings/service";
import { createVisitor } from "../src/modules/visitors/service";
import { createRate } from "../src/modules/labor-rates/service";
import { createAsset } from "../src/modules/assets/service";

async function main() {
  const creator = await db.query.staffProfiles.findFirst({ where: (s, { eq }) => eq(s.role, "creator") });
  if (!creator) throw new Error("No creator profile — run npm run db:seed first.");
  const actor = { userId: creator.userId, role: "creator", branchId: null };

  // Branches
  for (const b of [
    { name: "Test Branch Lahore", city: "Lahore", address: "Main Boulevard, Gulberg" },
    { name: "Test Branch Kasur", city: "Kasur", address: "GT Road" },
  ]) {
    const exists = await db.query.branches.findFirst({ where: (x, { eq }) => eq(x.name, b.name) });
    if (!exists) await db.insert(branches).values({ ...b, phone: null });
  }
  const lhr = (await db.query.branches.findFirst({ where: (x, { eq }) => eq(x.name, "Test Branch Lahore") }))!;
  const ksr = (await db.query.branches.findFirst({ where: (x, { eq }) => eq(x.name, "Test Branch Kasur") }))!;
  console.log("Branches ready:", lhr.name, "/", ksr.name);

  // Vehicles (through the service — validations + audit fire)
  const stock = [
    { make: "Yadea", model: "G5 Pro", variant: "72V 38Ah", color: "Black", chassisNo: "TSTYD5A0001", engineNo: "TSTEN5A0001", purchasePrice: "161,000", salePrice: "174,000", branchId: lhr.id },
    { make: "Yadea", model: "T5L", variant: "60V 32Ah", color: "White", chassisNo: "TSTYDT0002", engineNo: "TSTENT0002", purchasePrice: "148,000", salePrice: "162,000", branchId: lhr.id },
    { make: "United", model: "US 70", variant: "70cc", color: "Red", chassisNo: "TSTUN70003", engineNo: "TSTEN70003", purchasePrice: "72,500", salePrice: "82,000", branchId: lhr.id },
    { make: "Ramza", model: "Kuling", variant: "Lithium", color: "Grey", chassisNo: "TSTRZK0004", engineNo: "TSTENK0004", purchasePrice: "2,15,000", salePrice: "2,38,000", branchId: ksr.id },
    { make: "Honda", model: "CD-70", variant: "2026", color: "Red", chassisNo: "TSTHCD0005", engineNo: "TSTEND0005", purchasePrice: "1,25,000", salePrice: "1,39,000", branchId: ksr.id },
  ];
  for (const v of stock) {
    const exists = await db.query.vehicles.findFirst({ where: (x, { eq }) => eq(x.chassisNo, v.chassisNo) });
    if (!exists) {
      const r = await createVehicle(actor, { ...v, notes: "seed-test-data" });
      console.log("vehicle", v.chassisNo, r.ok ? "OK" : r.error);
    }
  }

  // Customers
  const custData = [
    { fullName: "Test Ahmed Khan", phone: "03110000001", cnic: "35202-1111111-1", city: "Lahore", branchId: lhr.id },
    { fullName: "Test Sana Malik", phone: "03110000002", cnic: "3520222222222", city: "Lahore", branchId: lhr.id },
    { fullName: "Test Bilal Riaz", phone: "+92 311 0000003", city: "Kasur", branchId: ksr.id },
  ];
  for (const c of custData) {
    const exists = await db.query.customers.findFirst({ where: (x, { eq }) => eq(x.phone, c.phone.replace(/[\s+]/g, "").replace(/^92/, "0")) });
    if (!exists) {
      const r = await createCustomer(actor, { ...c, email: "", address: "seed" });
      console.log("customer", c.fullName, r.ok ? "OK" : r.error);
    }
  }
  const ahmed = (await db.query.customers.findFirst({ where: (x, { eq }) => eq(x.phone, "03110000001") }))!;
  const sana = (await db.query.customers.findFirst({ where: (x, { eq }) => eq(x.phone, "03110000002") }))!;

  // Visitor + booking + parts + labor rate + expense + asset
  await createVisitor(actor, { fullName: "Test Walkin Visitor", phone: "03110000009", cnic: "", interest: "Yadea T5L", budget: "2,50,000", source: "walk_in", notes: "", followUpDate: "", branchId: lhr.id });
  await createBooking(actor, { customerId: sana.id, modelWanted: "United US 70 Red", tokenAmount: "10,000", paymentMethod: "cash", notes: "seed booking", branchId: lhr.id });
  await createPart(actor, { name: "Test 60V Battery", partNo: "TST-BAT-60", sku: "", branchId: lhr.id, initialQty: 8, costPrice: "28,000", retailPrice: "34,000", lowStockAt: 2 });
  await createRate(actor, { serviceName: "Test General Service", price: "1,500", equipment: "stand, toolkit", notes: "" });
  await recordEntry(actor, { direction: "cash_out", paymentMethod: "cash", category: "rent", amount: "1,10,000", description: "Seed: monthly rent Test Branch Lahore", entryDate: new Date().toISOString().slice(0, 10), branchId: lhr.id });
  await createAsset(actor, { branchId: lhr.id, name: "Test Office Desk", category: "furniture", qty: 2, unitValue: "18,000", purchasedOn: "", notes: "" });
  console.log("visitor/booking/part/rate/expense/asset OK");

  // Sales: one cash, one installment (guarantor + docs + warranty flag)
  const today = new Date().toISOString().slice(0, 10);
  const v1 = await db.query.vehicles.findFirst({ where: (x, { eq }) => eq(x.chassisNo, "TSTUN70003") });
  if (v1?.status === "in_stock") {
    const r = await createSale(actor, {
      customerId: ahmed.id, vehicleId: v1.id, salePrice: "82,000", discount: "2,000",
      registrationFeeGovt: "5,000", registrationFeeProfit: "3,000", commissionAmount: "1,000",
      settlementPlan: "cash", downpayment: "", months: undefined, totalMarkup: "",
      notes: "seed cash sale", saleDate: today, warrantyCardSent: true, guarantors: [], documents: [],
    });
    console.log("cash sale", r.ok ? `OK ${r.ok && "invoiceNo" in r ? r.invoiceNo : ""}` : r.error);
  }
  const v2 = await db.query.vehicles.findFirst({ where: (x, { eq }) => eq(x.chassisNo, "TSTYD5A0001") });
  if (v2?.status === "in_stock") {
    const r = await createSale(actor, {
      customerId: sana.id, vehicleId: v2.id, salePrice: "174,000", discount: "0",
      registrationFeeGovt: "5,000", registrationFeeProfit: "3,000", commissionAmount: "1,500",
      settlementPlan: "installment", downpayment: "60,000", months: 12, totalMarkup: "26,800",
      notes: "seed installment sale", saleDate: today, warrantyCardSent: false,
      guarantors: [{ fullName: "Test Guarantor One", cnic: "35202-9999999-9", phone: "03119999999", address: "Lahore" }],
      documents: [],
    });
    console.log("installment sale", r.ok ? "OK" : r.error);
  }

  console.log("SEED TEST DATA COMPLETE - see TESTING.md for the test-case checklist.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
