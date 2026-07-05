import { and, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { branches, ledgerEntries } from "@/db/schema";
import { seesAllBranches } from "./permissions";

export async function listEntries(opts: {
  role: string;
  ownBranchId: number | null;
  direction?: string;
  category?: string;
  branchId?: number;
  from?: string;
  to?: string;
}) {
  const filters: SQL[] = [];
  if (!seesAllBranches(opts.role)) {
    if (!opts.ownBranchId) return { rows: [], totalIn: "0", totalOut: "0" };
    filters.push(eq(ledgerEntries.branchId, opts.ownBranchId));
  } else if (opts.branchId) {
    filters.push(eq(ledgerEntries.branchId, opts.branchId));
  }
  if (opts.direction === "cash_in" || opts.direction === "cash_out") {
    filters.push(eq(ledgerEntries.direction, opts.direction));
  }
  if (opts.category) filters.push(eq(ledgerEntries.category, opts.category));
  if (opts.from) filters.push(gte(ledgerEntries.entryDate, opts.from));
  if (opts.to) filters.push(lte(ledgerEntries.entryDate, opts.to));

  const where = filters.length ? and(...filters) : undefined;

  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: ledgerEntries.id,
        direction: ledgerEntries.direction,
        paymentMethod: ledgerEntries.paymentMethod,
        category: ledgerEntries.category,
        amount: ledgerEntries.amount,
        description: ledgerEntries.description,
        invoiceId: ledgerEntries.invoiceId,
        entryDate: ledgerEntries.entryDate,
        branchName: branches.name,
        createdAt: ledgerEntries.createdAt,
      })
      .from(ledgerEntries)
      .innerJoin(branches, eq(ledgerEntries.branchId, branches.id))
      .where(where)
      .orderBy(desc(ledgerEntries.entryDate), desc(ledgerEntries.id))
      .limit(200),
    db
      .select({
        totalIn: sql<string>`coalesce(sum(${ledgerEntries.amount}) filter (where ${ledgerEntries.direction} = 'cash_in'), 0)`,
        totalOut: sql<string>`coalesce(sum(${ledgerEntries.amount}) filter (where ${ledgerEntries.direction} = 'cash_out'), 0)`,
      })
      .from(ledgerEntries)
      .where(where),
  ]);

  return { rows, totalIn: totals.totalIn, totalOut: totals.totalOut };
}
