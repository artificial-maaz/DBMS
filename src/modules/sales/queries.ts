import { and, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { branches, customers, invoices, vehicles } from "@/db/schema";
import { listOpenBookingsForSale } from "@/modules/bookings/queries";
import { listActiveRequirements } from "@/modules/document-requirements/queries";
import { listActivePlansForSale } from "@/modules/installment-plans/queries";
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
      saleDate: invoices.saleDate,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .innerJoin(branches, eq(invoices.branchId, branches.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(invoices.saleDate), desc(invoices.createdAt));
}

/** Full invoice detail — scoped: employees can only open their branch's invoices. */
export async function getInvoiceDetail(opts: { id: number; role: string; ownBranchId: number | null }) {
  const inv = await db.query.invoices.findFirst({
    where: (i, { eq }) => eq(i.id, opts.id),
  });
  if (!inv) return null;
  if (!seesAllBranches(opts.role) && inv.branchId !== opts.ownBranchId) return null;

  const [customer, branch, items, schedule, invoiceGuarantors, documents] = await Promise.all([
    db.query.customers.findFirst({ where: (c, { eq }) => eq(c.id, inv.customerId) }),
    db.query.branches.findFirst({ where: (b, { eq }) => eq(b.id, inv.branchId) }),
    db.query.invoiceItems.findMany({ where: (it, { eq }) => eq(it.invoiceId, inv.id) }),
    db.query.installmentSchedules.findMany({
      where: (sc, { eq }) => eq(sc.invoiceId, inv.id),
      orderBy: (sc, { asc }) => asc(sc.installmentNo),
    }),
    db.query.guarantors.findMany({ where: (g, { eq }) => eq(g.invoiceId, inv.id) }),
    db.query.invoiceDocuments.findMany({ where: (dc, { eq }) => eq(dc.invoiceId, inv.id) }),
  ]);

  return { invoice: inv, customer, branch, items, schedule, guarantors: invoiceGuarantors, documents };
}

/** Data the "New Sale" form needs: sellable stock + customers, branch-scoped. */
export async function getSaleFormData(opts: { role: string; ownBranchId: number | null }) {
  const all = seesAllBranches(opts.role);
  // Cross-branch ops (Sir 2026-07-31): sales-floor staff can sell ANY branch's
  // stock, so the vehicle list is all-branch for everyone who can create a sale
  // (labels carry the branch name; purchase prices are never in this query).
  const stockWhere = eq(vehicles.status, "in_stock");

  const [stock, customerList, openBookings, plans, requirements] = await Promise.all([
    db
      .select({
        id: vehicles.id,
        make: vehicles.make,
        model: vehicles.model,
        chassisNo: vehicles.chassisNo,
        salePrice: vehicles.salePrice,
        branchId: vehicles.branchId,
        branchName: branches.name,
      })
      .from(vehicles)
      .innerJoin(branches, eq(vehicles.branchId, branches.id))
      .where(stockWhere),
    db
      .select({ id: customers.id, fullName: customers.fullName, phone: customers.phone })
      .from(customers)
      .where(all ? undefined : eq(customers.branchId, opts.ownBranchId ?? -1))
      .orderBy(desc(customers.createdAt)),
    listOpenBookingsForSale({ role: opts.role, ownBranchId: opts.ownBranchId }),
    listActivePlansForSale(),
    listActiveRequirements(),
  ]);

  return {
    // Sir (2026-08-06): sorted so identical models sit together instead of
    // scattering down the list, and EVERY row names its branch so staff can see
    // what is available and where — not just the ones outside their own branch.
    vehicles: stock
      .slice()
      .sort(
        (a, b) =>
          a.make.localeCompare(b.make) ||
          a.model.localeCompare(b.model) ||
          a.chassisNo.localeCompare(b.chassisNo),
      )
      .map((v) => ({
        id: v.id,
        label: `${v.make} ${v.model} — ${v.chassisNo}`,
        group: `${v.make} ${v.model}`,
        branchName: v.branchName,
        ownBranch: v.branchId === opts.ownBranchId,
        make: v.make,
        model: v.model,
        salePrice: v.salePrice,
      })),
    customers: customerList.map((c) => ({ id: c.id, label: `${c.fullName} (${c.phone})` })),
    openBookings: openBookings.map((b) => ({
      id: b.id,
      customerId: b.customerId,
      modelWanted: b.modelWanted,
      tokenAmount: b.tokenAmount,
    })),
    plans,
    requirements,
  };
}
