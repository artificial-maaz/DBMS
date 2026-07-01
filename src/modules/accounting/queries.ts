import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { branchAssets, invoices, ledgerEntries, purchaseOrders, spareParts, vehicles } from "@/db/schema";

/**
 * #22 deep accounting layer. The hybrid ledger was built double-entry-READY:
 * every entry is categorized, dated, reference-linked, append-only. Here we
 * PROJECT it into formal statements — no new bookkeeping burden on staff.
 *
 * Category -> account mapping (cash_in credits it, cash_out debits it;
 * Cash account takes the other side).
 */
const ACCOUNT: Record<string, { name: string; type: "revenue" | "expense" | "asset" | "liability" }> = {
  sale: { name: "Sales Revenue", type: "revenue" },
  installment: { name: "Installment Receipts", type: "revenue" },
  booking_token: { name: "Booking Tokens (Advances)", type: "liability" },
  repair: { name: "Workshop Revenue", type: "revenue" },
  purchase: { name: "Inventory Purchases", type: "asset" },
  rent: { name: "Rent Expense", type: "expense" },
  utilities: { name: "Utilities Expense", type: "expense" },
  salary: { name: "Salaries Expense", type: "expense" },
  fuel: { name: "Fuel Expense", type: "expense" },
  stationery: { name: "Stationery Expense", type: "expense" },
  refreshments: { name: "Refreshments Expense", type: "expense" },
  other: { name: "Other", type: "expense" },
};
const acct = (category: string) => ACCOUNT[category] ?? { name: `Uncategorized (${category})`, type: "expense" as const };

/** General journal: each ledger entry becomes a balanced DR/CR pair. */
export async function generalJournal(opts: { from?: string; to?: string; branchId?: number }) {
  const filters = [];
  if (opts.from) filters.push(gte(ledgerEntries.entryDate, opts.from));
  if (opts.to) filters.push(lte(ledgerEntries.entryDate, opts.to));
  if (opts.branchId) filters.push(eq(ledgerEntries.branchId, opts.branchId));

  const rows = await db
    .select()
    .from(ledgerEntries)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(ledgerEntries.entryDate, ledgerEntries.id)
    .limit(500);

  return rows.map((e) => {
    const account = acct(e.category);
    const isIn = e.direction === "cash_in";
    return {
      id: e.id,
      date: e.entryDate,
      description: e.description,
      amount: e.amount,
      // cash_in: DR Cash / CR account · cash_out: DR account / CR Cash
      debit: isIn ? "Cash / Bank" : account.name,
      credit: isIn ? account.name : "Cash / Bank",
      reversal: e.reversesEntryId != null,
    };
  });
}

/** Trial balance: net DR/CR per account — balances by construction, verified anyway. */
export async function trialBalance(opts: { from?: string; to?: string; branchId?: number }) {
  const journal = await generalJournal({ ...opts });
  const totals = new Map<string, { debit: number; credit: number }>();
  const bump = (name: string, side: "debit" | "credit", amt: number) => {
    const t = totals.get(name) ?? { debit: 0, credit: 0 };
    t[side] += amt;
    totals.set(name, t);
  };
  for (const j of journal) {
    const amt = Number(j.amount);
    bump(j.debit, "debit", amt);
    bump(j.credit, "credit", amt);
  }
  const accounts = [...totals.entries()]
    .map(([name, t]) => {
      const net = t.debit - t.credit;
      return { name, debit: net > 0 ? net : 0, credit: net < 0 ? -net : 0 };
    })
    .filter((a) => a.debit > 0.005 || a.credit > 0.005)
    .sort((a, b) => a.name.localeCompare(b.name));
  const totalDebit = accounts.reduce((s, a) => s + a.debit, 0);
  const totalCredit = accounts.reduce((s, a) => s + a.credit, 0);
  return { accounts, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 };
}

/** Balance sheet / statement of financial position — as of now. */
export async function balanceSheet(branchId?: number) {
  // Every table below has its own branch_id column, so this helper must accept
  // ANY of them — not just the ledger's (that mistake broke the build).
  const br = (col: AnyPgColumn) => (branchId ? eq(col, branchId) : undefined);

  const [cash] = await db
    .select({
      v: sql<string>`coalesce(sum(case when ${ledgerEntries.direction} = 'cash_in' then ${ledgerEntries.amount} else -${ledgerEntries.amount} end), 0)`,
    })
    .from(ledgerEntries)
    .where(br(ledgerEntries.branchId));

  const [inv] = await db
    .select({ v: sql<string>`coalesce(sum(${vehicles.purchasePrice}), 0)` })
    .from(vehicles)
    .where(and(inArray(vehicles.status, ["in_stock", "in_transit", "in_repair"]), br(vehicles.branchId)));

  const [parts] = await db
    .select({ v: sql<string>`coalesce(sum(${spareParts.currentQty} * coalesce(${spareParts.costPrice}, 0)), 0)` })
    .from(spareParts)
    .where(br(spareParts.branchId));

  const [recv] = await db
    .select({ v: sql<string>`coalesce(sum(${invoices.balanceDue}), 0)` })
    .from(invoices)
    .where(and(eq(invoices.status, "active"), br(invoices.branchId)));

  const [fixed] = await db
    .select({ v: sql<string>`coalesce(sum(${branchAssets.qty} * ${branchAssets.unitValue}), 0)` })
    .from(branchAssets)
    .where(and(eq(branchAssets.isActive, true), br(branchAssets.branchId)));

  const [payable] = await db
    .select({ v: sql<string>`coalesce(sum(${purchaseOrders.totalCost} - ${purchaseOrders.amountPaid}), 0)` })
    .from(purchaseOrders)
    .where(br(purchaseOrders.branchId));

  const assets = {
    cash: Number(cash.v),
    vehicleInventory: Number(inv.v),
    sparePartsStock: Number(parts.v),
    receivables: Number(recv.v),
    fixedAssets: Number(fixed.v),
  };
  const totalAssets = Object.values(assets).reduce((a, b) => a + b, 0);
  const liabilities = { supplierPayables: Number(payable.v) };
  const totalLiabilities = liabilities.supplierPayables;
  // Equity is the residual — the accounting equation holds by construction.
  const equity = totalAssets - totalLiabilities;

  return { assets, totalAssets, liabilities, totalLiabilities, equity };
}
