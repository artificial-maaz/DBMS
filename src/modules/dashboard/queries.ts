import { and, count, eq, gte, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { branches, invoices, vehicles } from "@/db/schema";

/**
 * Dashboard chart data (GUI phase, 2026-08-04).
 *
 * Everything here is aggregate-only — counts and sums, never per-vehicle
 * purchase prices — so it is safe to render for any role that can see the
 * dashboard. Financial series stay gated at the page level.
 */

/** Last 6 months of sales count + revenue, oldest first. */
export async function salesTrend(months = 6) {
  const now = new Date();
  const out: { label: string; sales: number; revenue: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1));
    const [row] = await db
      .select({
        n: count(),
        rev: sql<string>`coalesce(sum(${invoices.total}), 0)`,
      })
      .from(invoices)
      .where(
        and(
          gte(invoices.saleDate, start.toISOString().slice(0, 10)),
          lt(invoices.saleDate, end.toISOString().slice(0, 10)),
          ne(invoices.status, "cancelled"),
        ),
      );

    out.push({
      label: start.toLocaleString("en-PK", { timeZone: "Asia/Karachi", month: "short" }),
      sales: row.n,
      revenue: Number(row.rev),
    });
  }
  return out;
}

/** In-stock unit count per branch — feeds the donut. */
export async function stockByBranch() {
  return db
    .select({ label: branches.name, value: count() })
    .from(vehicles)
    .innerJoin(branches, eq(vehicles.branchId, branches.id))
    .where(eq(vehicles.status, "in_stock"))
    .groupBy(branches.name)
    .orderBy(sql`count(*) desc`);
}

/** In-stock unit count per make — what's actually sitting on the floor. */
export async function stockByMake(limit = 6) {
  return db
    .select({ label: vehicles.make, value: count() })
    .from(vehicles)
    .where(eq(vehicles.status, "in_stock"))
    .groupBy(vehicles.make)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
}
