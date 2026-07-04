import { and, eq, gte, lt, ne, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { installmentSchedules, invoiceItems, invoices, ledgerEntries, vehicles } from "@/db/schema";

/**
 * Monthly P&L (accrual-flavored, from real records):
 *   Revenue   = (subtotal − discount) + showroom reg-fee profit + installment markup (recognized at sale)
 *   COGS      = purchase price of vehicles sold that month
 *   Gross     = Revenue − COGS
 *   Expenses  = ledger cash_out for the month, grouped by category
 *               ('purchase' excluded — buying stock is an asset, not an expense)
 *   Net       = Gross − Expenses − commissions
 * Creator/Owner only (enforced at the page).
 */
export async function getMonthlyPnl(opts: { year: number; month: number; branchId?: number }) {
  const start = new Date(Date.UTC(opts.year, opts.month - 1, 1));
  const end = new Date(Date.UTC(opts.year, opts.month, 1));
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const invFilters: SQL[] = [
    gte(invoices.createdAt, start),
    lt(invoices.createdAt, end),
    ne(invoices.status, "cancelled"),
  ];
  if (opts.branchId) invFilters.push(eq(invoices.branchId, opts.branchId));
  const invWhere = and(...invFilters);

  const [sales] = await db
    .select({
      netSales: sql<string>`coalesce(sum(${invoices.subtotal} - ${invoices.discount}), 0)`,
      regProfit: sql<string>`coalesce(sum(${invoices.registrationFeeProfit}), 0)`,
      commissions: sql<string>`coalesce(sum(${invoices.commissionAmount}), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(invoices)
    .where(invWhere);

  const [markup] = await db
    .select({ total: sql<string>`coalesce(sum(${installmentSchedules.markup}), 0)` })
    .from(installmentSchedules)
    .innerJoin(invoices, eq(installmentSchedules.invoiceId, invoices.id))
    .where(invWhere);

  const [cogs] = await db
    .select({ total: sql<string>`coalesce(sum(${vehicles.purchasePrice}), 0)` })
    .from(invoiceItems)
    .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
    .innerJoin(vehicles, eq(invoiceItems.vehicleId, vehicles.id))
    .where(invWhere);

  const ledFilters: SQL[] = [
    eq(ledgerEntries.direction, "cash_out"),
    gte(ledgerEntries.entryDate, startStr),
    lt(ledgerEntries.entryDate, endStr),
    ne(ledgerEntries.category, "purchase"),
  ];
  if (opts.branchId) ledFilters.push(eq(ledgerEntries.branchId, opts.branchId));

  const expenseRows = await db
    .select({
      category: ledgerEntries.category,
      total: sql<string>`sum(${ledgerEntries.amount})`,
    })
    .from(ledgerEntries)
    .where(and(...ledFilters))
    .groupBy(ledgerEntries.category)
    .orderBy(sql`sum(${ledgerEntries.amount}) desc`);

  const n = (v: string) => Number(v);
  const revenue = n(sales.netSales) + n(sales.regProfit) + n(markup.total);
  const grossProfit = revenue - n(cogs.total);
  const totalExpenses = expenseRows.reduce((acc, r) => acc + n(r.total), 0);
  const netProfit = grossProfit - totalExpenses - n(sales.commissions);

  return {
    invoiceCount: sales.count,
    netSales: n(sales.netSales),
    regProfit: n(sales.regProfit),
    markup: n(markup.total),
    revenue,
    cogs: n(cogs.total),
    grossProfit,
    expenses: expenseRows.map((r) => ({ category: r.category, total: n(r.total) })),
    totalExpenses,
    commissions: n(sales.commissions),
    netProfit,
  };
}
