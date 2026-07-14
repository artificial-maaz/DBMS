import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { bookings, branches, customers, invoiceItems, invoices, jobCards, testDrives } from "@/db/schema";
import { seesAllBranches } from "./permissions";

/**
 * Branch scoping mirrors inventory: employees only ever query their branch.
 * `q` searches name / phone / CNIC — the global-search building block.
 */
/**
 * Abrar #2 (2026-07-14): Customer 360 — one page with everything about one
 * customer: profile, every purchase (with balance + plan), bookings, test
 * drives, workshop visits. Branch-scoped like everything else.
 */
export async function getCustomer360(opts: { id: number; role: string; ownBranchId: number | null }) {
  const customer = await db.query.customers.findFirst({ where: (c, { eq }) => eq(c.id, opts.id) });
  if (!customer) return null;
  if (!seesAllBranches(opts.role) && customer.branchId !== opts.ownBranchId) return null;

  const [branch, purchases, customerBookings, rides, jobs] = await Promise.all([
    db.query.branches.findFirst({ where: (b, { eq }) => eq(b.id, customer.branchId) }),
    db
      .select({
        id: invoices.id,
        invoiceNo: invoices.invoiceNo,
        saleDate: invoices.saleDate,
        settlementPlan: invoices.settlementPlan,
        total: invoices.total,
        downpayment: invoices.downpayment,
        balanceDue: invoices.balanceDue,
        status: invoices.status,
        vehicleDesc: sql<string>`(
          select string_agg(${invoiceItems.description}, ', ')
          from ${invoiceItems} where ${invoiceItems.invoiceId} = ${invoices.id} and ${invoiceItems.vehicleId} is not null
        )`,
      })
      .from(invoices)
      .where(eq(invoices.customerId, opts.id))
      .orderBy(desc(invoices.saleDate)),
    db.select().from(bookings).where(eq(bookings.customerId, opts.id)).orderBy(desc(bookings.createdAt)),
    db.select().from(testDrives).where(eq(testDrives.customerId, opts.id)).orderBy(desc(testDrives.scheduledAt)),
    db
      .select({
        id: jobCards.id,
        jobNo: jobCards.jobNo,
        chassisNo: jobCards.chassisNo,
        status: jobCards.status,
        warrantyStatus: jobCards.warrantyStatus,
        couponNo: jobCards.couponNo,
        laborCharge: jobCards.laborCharge,
        partsCharge: jobCards.partsCharge,
        createdAt: jobCards.createdAt,
      })
      .from(jobCards)
      .where(eq(jobCards.customerId, opts.id))
      .orderBy(desc(jobCards.createdAt)),
  ]);

  return { customer, branch, purchases, bookings: customerBookings, rides, jobs };
}

export async function listCustomers(opts: {
  role: string;
  ownBranchId: number | null;
  q?: string;
  branchId?: number;
}) {
  const filters: SQL[] = [];

  if (!seesAllBranches(opts.role)) {
    if (!opts.ownBranchId) return [];
    filters.push(eq(customers.branchId, opts.ownBranchId));
  } else if (opts.branchId) {
    filters.push(eq(customers.branchId, opts.branchId));
  }

  if (opts.q) {
    const like = `%${opts.q.trim()}%`;
    const conds = [ilike(customers.fullName, like), ilike(customers.phone, like), ilike(customers.cnic, like)];
    // Digit-only matching: "3420256087749" finds the dashed CNIC, "+92 300…" finds the phone.
    const qDigits = opts.q.replace(/\D/g, "");
    if (qDigits.length >= 5) {
      const dLike = `%${qDigits}%`;
      conds.push(sql`replace(${customers.cnic}, '-', '') ilike ${dLike}`, ilike(customers.phone, dLike));
    }
    filters.push(or(...conds)!);
  }

  return db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      cnic: customers.cnic,
      phone: customers.phone,
      email: customers.email,
      address: customers.address,
      city: customers.city,
      branchId: customers.branchId,
      branchName: branches.name,
      createdAt: customers.createdAt,
    })
    .from(customers)
    .innerJoin(branches, eq(customers.branchId, branches.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(customers.createdAt));
}
