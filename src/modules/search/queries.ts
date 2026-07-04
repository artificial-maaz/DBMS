import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { branches, customers, invoices, vehicles } from "@/db/schema";

function branchScope(col: typeof vehicles.branchId, role: string, ownBranchId: number | null): SQL | undefined {
  return ["creator", "owner"].includes(role) ? undefined : eq(col, ownBranchId ?? -1);
}

/**
 * Global search: one box, three domains — vehicles (chassis/engine),
 * customers (name/phone/CNIC), invoices (number). Branch scoping applies
 * per domain exactly as in each module.
 */
export async function globalSearch(opts: { q: string; role: string; ownBranchId: number | null }) {
  const like = `%${opts.q.trim()}%`;
  const qDigits = opts.q.replace(/\D/g, "");
  const digitConds =
    qDigits.length >= 5
      ? [
          sql`replace(${customers.cnic}, '-', '') ilike ${`%${qDigits}%`}`,
          ilike(customers.phone, `%${qDigits}%`),
        ]
      : [];

  const [vehicleHits, customerHits, invoiceHits] = await Promise.all([
    db
      .select({
        id: vehicles.id,
        make: vehicles.make,
        model: vehicles.model,
        chassisNo: vehicles.chassisNo,
        engineNo: vehicles.engineNo,
        status: vehicles.status,
        branchName: branches.name,
      })
      .from(vehicles)
      .innerJoin(branches, eq(vehicles.branchId, branches.id))
      .where(
        and(
          or(ilike(vehicles.chassisNo, like), ilike(vehicles.engineNo, like), ilike(vehicles.model, like)),
          branchScope(vehicles.branchId, opts.role, opts.ownBranchId),
        ),
      )
      .orderBy(desc(vehicles.createdAt))
      .limit(10),
    db
      .select({
        id: customers.id,
        fullName: customers.fullName,
        phone: customers.phone,
        cnic: customers.cnic,
        branchName: branches.name,
      })
      .from(customers)
      .innerJoin(branches, eq(customers.branchId, branches.id))
      .where(
        and(
          or(ilike(customers.fullName, like), ilike(customers.phone, like), ilike(customers.cnic, like), ...digitConds),
          branchScope(customers.branchId, opts.role, opts.ownBranchId),
        ),
      )
      .orderBy(desc(customers.createdAt))
      .limit(10),
    db
      .select({
        id: invoices.id,
        invoiceNo: invoices.invoiceNo,
        total: invoices.total,
        status: invoices.status,
        customerName: customers.fullName,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .where(and(ilike(invoices.invoiceNo, like), branchScope(invoices.branchId, opts.role, opts.ownBranchId)))
      .orderBy(desc(invoices.createdAt))
      .limit(10),
  ]);

  return { vehicles: vehicleHits, customers: customerHits, invoices: invoiceHits };
}
