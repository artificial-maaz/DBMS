import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { branches, customers, invoices, vehicles } from "@/db/schema";
import { canViewCustomers } from "@/modules/customers/permissions";
import { canViewSales } from "@/modules/sales/permissions";

// Accepts ANY table's branch_id column (vehicles, customers, invoices) — typing
// it to one specific table breaks the production type check.
function branchScope(col: AnyPgColumn, role: string, ownBranchId: number | null): SQL | undefined {
  return ["creator", "owner", "silent_partner"].includes(role) ? undefined : eq(col, ownBranchId ?? -1);
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

  // Search never shows a role more than its modules would (mechanic/assistant/gate
  // staff can look up vehicles, but customers & invoices stay out of their results).
  const showCustomers = canViewCustomers(opts.role);
  const showInvoices = canViewSales(opts.role);

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
    showCustomers
      ? db
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
          .limit(10)
      : Promise.resolve([]),
    showInvoices
      ? db
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
          .limit(10)
      : Promise.resolve([]),
  ]);

  return { vehicles: vehicleHits, customers: customerHits, invoices: invoiceHits };
}
