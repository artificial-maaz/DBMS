import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { branches, ledgerEntries, vehicles } from "@/db/schema";
import type { StockLine } from "./templates";

/**
 * Live stock for the daily Stock Report.
 *
 * The point of generating this instead of typing it: the report IS the stock
 * count that head office trusts. Typed by hand at the end of a long day, it
 * drifts from the system — and then nobody knows which number is real. Read
 * straight from inventory, the message and the database cannot disagree.
 */
export async function stockLinesForBranch(branchId: number): Promise<StockLine[]> {
  const rows = await db
    .select({
      make: vehicles.make,
      model: vehicles.model,
      color: vehicles.color,
      qty: sql<number>`count(*)::int`,
    })
    .from(vehicles)
    .where(and(eq(vehicles.branchId, branchId), eq(vehicles.status, "in_stock")))
    .groupBy(vehicles.make, vehicles.model, vehicles.color)
    .orderBy(vehicles.make, vehicles.model);

  return rows.map((r) => ({ make: r.make, model: r.model, color: r.color, qty: Number(r.qty) }));
}

/**
 * Today's cash position for that branch, so "Cash in hand" is not a guess.
 * Sum of the append-only ledger for today — cash in minus cash out.
 */
export async function todaysCashForBranch(branchId: number): Promise<string> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  const [row] = await db
    .select({
      net: sql<string>`coalesce(sum(case when ${ledgerEntries.direction} = 'cash_in'
        then ${ledgerEntries.amount} else -${ledgerEntries.amount} end), 0)`,
    })
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.branchId, branchId), eq(ledgerEntries.entryDate, today)));

  return Number(row?.net ?? 0).toLocaleString("en-PK");
}

export async function listBranchesForFormats() {
  return db
    .select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(eq(branches.isActive, true))
    .orderBy(branches.name);
}
