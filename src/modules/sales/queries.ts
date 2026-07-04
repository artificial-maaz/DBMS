import { and, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { branches, customers, invoices, vehicles } from "@/db/schema";
import { seesAllBranches } from "./permissions";

export async function listInvoices(opts: { role: string; ownBranchId: number | null; branchId?: number }) {
  const filters: SQL[] = [];
  if (!seesAllBranches(opts.role)) {
    if (!opts.ownBranchId) return [];
    filters.push(eq(invoices.branchId, opts.ownBranchId));
  } else if (opts.branchId) {
    filters.push(eq(invoices.branchId, opts.branchId));
  }

  return db
    .select({
      id: invoices.id,
      invoiceNo: invoices.invoiceNo,
      customerName: customers.fullName,
      settlementPlan: invoices.settlementPlan,
      total: invoices.total,
      downpayment: invoices.downpayment,
      balanceDue: invoices.balanceDue,
      status: invoices.status,
      branchName: branches.name,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .innerJoin(branches, eq(invoices.branchId, branches.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(invoices.createdAt));
}

/** Full invoice detail — scoped: employees can only open their branch's invoices. */
export async function getInvoiceDetail(opts: { id: number; role: string; ownBranchId: number | null }) {
  const inv = await db.query.invoices.findFirst({
    where: (i, { eq }) => eq(i.id, opts.id),
  });
  if (!inv) return null;
  if (!seesAllBranches(opts.role) && inv.branchId !== opts.ownBranchId) return null;

  const [customer, branch, items, schedule] = await Promise.all([
    db.query.customers.findFirst({ where: (c, { eq }) => eq(c.id, inv.customerId) }),
    db.query.branches.findFirst({ where: (b, { eq }) => eq(b.id, inv.branchId) }),
    db.query.invoiceItems.findMany({ where: (it, { eq }) => eq(it.invoiceId, inv.id) }),
    db.query.installmentSchedules.findMany({
      where: (sc, { eq }) => eq(sc.invoiceId, inv.id),
      orderBy: (sc, { asc }) => asc(sc.installmentNo),
    }),
  ]);

  return { invoice: inv, customer, branch, items, schedule };
}

/** Data the "New Sale" form needs: sellable stock + customers, branch-scoped. */
export async function getSaleFormData(opts: { role: string; ownBranchId: number | null }) {
  const all = seesAllBranches(opts.role);
  const stockWhere = all
    ? eq(vehicles.status, "in_stock")
    : and(eq(vehicles.status, "in_stock"), eq(vehicles.branchId, opts.ownBranchId ?? -1));

  const [stock, customerList] = await Promise.all([
    db
      .select({
        id: vehicles.id,
        label: vehicles.make,
        model: vehicles.model,
        chassisNo: vehicles.chassisNo,
        salePrice: vehicles.salePrice,
        branchId: vehicles.branchId,
      })
      .from(vehicles)
      .where(stockWhere),
    db
      .select({ id: customers.id, fullName: customers.fullName, phone: customers.phone })
      .from(customers)
      .where(all ? undefined : eq(customers.branchId, opts.ownBranchId ?? -1))
      .orderBy(desc(customers.createdAt)),
  ]);

  return {
    vehicles: stock.map((v) => ({
      id: v.id,
      label: `${v.label} ${v.model} — ${v.chassisNo}`,
      salePrice: v.salePrice,
    })),
    customers: customerList.map((c) => ({ id: c.id, label: `${c.fullName} (${c.phone})` })),
  };
}
