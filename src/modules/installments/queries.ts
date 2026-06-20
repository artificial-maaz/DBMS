import { and, asc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { branches, customers, installmentSchedules, invoices } from "@/db/schema";
import { seesAllBranches } from "./permissions";

/**
 * Installment Cases (Sir #3, 2026-07-31) — one place to see the STATUS of every
 * installment sale: cleared, on-track, or overdue (not paying timely).
 * Pure projection over invoices + schedules — no schema change, no new writes.
 */
export type CaseStatus = "cleared" | "on_track" | "overdue";

export async function listInstallmentCases(opts: {
  role: string;
  ownBranchId: number | null;
  branchId?: number;
  status?: CaseStatus;
}) {
  const filters: SQL[] = [eq(invoices.settlementPlan, "installment")];
  if (!seesAllBranches(opts.role)) {
    if (!opts.ownBranchId) return [];
    filters.push(eq(invoices.branchId, opts.ownBranchId));
  } else if (opts.branchId) {
    filters.push(eq(invoices.branchId, opts.branchId));
  }

  const rows = await db
    .select({
      id: invoices.id,
      invoiceNo: invoices.invoiceNo,
      customerId: invoices.customerId,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      branchName: branches.name,
      total: invoices.total,
      downpayment: invoices.downpayment,
      balanceDue: invoices.balanceDue,
      saleDate: invoices.saleDate,
      invoiceStatus: invoices.status,
      totalInstallments: sql<number>`count(${installmentSchedules.id})::int`,
      paidInstallments: sql<number>`count(*) filter (where ${installmentSchedules.status} = 'paid')::int`,
      totalPaid: sql<string>`coalesce(sum(${installmentSchedules.paidAmount}), 0)`,
      // Earliest unpaid installment that is already past due — drives "overdue".
      earliestOverdue: sql<string | null>`min(${installmentSchedules.dueDate}) filter (where ${installmentSchedules.status} <> 'paid' and ${installmentSchedules.dueDate} < current_date)`,
      overdueCount: sql<number>`count(*) filter (where ${installmentSchedules.status} <> 'paid' and ${installmentSchedules.dueDate} < current_date)::int`,
      overdueAmount: sql<string>`coalesce(sum(${installmentSchedules.totalDue} + ${installmentSchedules.lateFee} - ${installmentSchedules.paidAmount}) filter (where ${installmentSchedules.status} <> 'paid' and ${installmentSchedules.dueDate} < current_date), 0)`,
      nextDueDate: sql<string | null>`min(${installmentSchedules.dueDate}) filter (where ${installmentSchedules.status} <> 'paid' and ${installmentSchedules.dueDate} >= current_date)`,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .innerJoin(branches, eq(invoices.branchId, branches.id))
    .leftJoin(installmentSchedules, eq(installmentSchedules.invoiceId, invoices.id))
    .where(and(...filters))
    .groupBy(invoices.id, customers.id, branches.id)
    .orderBy(asc(invoices.saleDate));

  const withStatus = rows.map((r) => {
    const cleared = Number(r.balanceDue) <= 0 || (r.totalInstallments > 0 && r.paidInstallments === r.totalInstallments);
    const status: CaseStatus = cleared ? "cleared" : r.overdueCount > 0 ? "overdue" : "on_track";
    const daysOverdue = r.earliestOverdue
      ? Math.floor((Date.now() - new Date(r.earliestOverdue).getTime()) / 86_400_000)
      : 0;
    return { ...r, status, daysOverdue };
  });

  // Overdue first (worst offenders on top), then on-track by next due, then cleared.
  const rank: Record<CaseStatus, number> = { overdue: 0, on_track: 1, cleared: 2 };
  withStatus.sort((a, b) => rank[a.status] - rank[b.status] || b.daysOverdue - a.daysOverdue);

  return opts.status ? withStatus.filter((r) => r.status === opts.status) : withStatus;
}
