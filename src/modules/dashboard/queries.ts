import { and, count, eq, gte, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { branches, invoices, vehicles } from "@/db/schema";

/**
 * Dashboard chart data (GUI phase; filters added 2026-08-06).
 *
 * Everything here is aggregate-only — counts and sums, never per-vehicle
 * purchase prices — so it is safe for any role that can see the dashboard.
 * Financial series stay gated at the page level.
 */

/** How far back the trend chart looks. */
export const TREND_RANGES = {
  "6m": { months: 6, label: "Last 6 months" },
  "12m": { months: 12, label: "Last 12 months" },
  "24m": { months: 24, label: "Last 2 years" },
} as const;
export type TrendRange = keyof typeof TREND_RANGES;

/** What the stock donut is sliced by. */
/** Colour was dropped (Sir, 2026-08-06) — too many thin slices to be useful. */
export const STOCK_GROUPS = {
  branch: "By branch",
  make: "By company",
  model: "By model",
} as const;
export type StockGroup = keyof typeof STOCK_GROUPS;

/**
 * Sales count + revenue per month, oldest first.
 *
 * Over 24 months the x-axis labels would collide, so anything past a year is
 * labelled "Mon 'YY" and only every other label is rendered by the chart.
 */
export async function salesTrend(range: TrendRange = "6m") {
  const months = TREND_RANGES[range].months;
  const now = new Date();
  const out: { label: string; sales: number; revenue: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1));
    const [row] = await db
      .select({ n: count(), rev: sql<string>`coalesce(sum(${invoices.total}), 0)` })
      .from(invoices)
      .where(
        and(
          gte(invoices.saleDate, start.toISOString().slice(0, 10)),
          lt(invoices.saleDate, end.toISOString().slice(0, 10)),
          ne(invoices.status, "cancelled"),
        ),
      );

    const short = start.toLocaleString("en-PK", { timeZone: "Asia/Karachi", month: "short" });
    out.push({
      label: months > 12 ? `${short} '${String(start.getUTCFullYear()).slice(2)}` : short,
      sales: row.n,
      revenue: Number(row.rev),
    });
  }
  return out;
}

/**
 * In-stock units grouped by whichever dimension is selected.
 * A single query shape with a swapped grouping column — no branching logic,
 * so adding another dimension later is a one-line change.
 */
export async function stockBreakdown(group: StockGroup = "branch") {
  const base = db
    .select({
      label:
        group === "branch"
          ? branches.name
          : group === "make"
            ? vehicles.make
            : sql<string>`${vehicles.make} || ' ' || ${vehicles.model}`,
      value: count(),
    })
    .from(vehicles);

  const q = group === "branch" ? base.innerJoin(branches, eq(vehicles.branchId, branches.id)) : base;

  return q
    .where(eq(vehicles.status, "in_stock"))
    .groupBy(
      group === "branch"
        ? branches.name
        : group === "make"
          ? vehicles.make
          : sql`${vehicles.make} || ' ' || ${vehicles.model}`,
    )
    .orderBy(sql`count(*) desc`)
    .limit(8);
}

/** In-stock unit count per make — the horizontal bar list. */
export async function stockByMake(limit = 6) {
  return db
    .select({ label: vehicles.make, value: count() })
    .from(vehicles)
    .where(eq(vehicles.status, "in_stock"))
    .groupBy(vehicles.make)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
}
