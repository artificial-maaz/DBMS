import { and, count, eq, gte, sql } from "drizzle-orm";
import { BikeHero } from "@/components/bike-hero";
import { AreaTrend, BarList, Donut } from "@/components/charts";
import { Card, EmptyState, StatCard } from "@/components/ui";
import {
  salesTrend,
  stockBreakdown,
  stockByMake,
  STOCK_GROUPS,
  TREND_RANGES,
  type StockGroup,
  type TrendRange,
} from "@/modules/dashboard/queries";
import { FilterPills } from "./chart-filters";
import { topBranches, topSalespeople } from "@/modules/reports/queries";
import { db } from "@/db";
import { invoices, ledgerEntries, vehicles } from "@/db/schema";
import { canSeeFinancials, requireStaff } from "@/lib/session";

/**
 * KPI dashboard. Financial cards render ONLY for Creator/Owners —
 * this is a server component, so restricted numbers never even leave
 * the server for employee sessions (RBAC rule, not CSS hiding).
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; by?: string }>;
}) {
  const { profile } = await requireStaff();
  const financial = canSeeFinancials(profile.role);

  // Filters ride in the URL so a view is shareable and the back button works.
  const sp = await searchParams;
  const range: TrendRange = sp.range && sp.range in TREND_RANGES ? (sp.range as TrendRange) : "6m";
  const group: StockGroup = sp.by && sp.by in STOCK_GROUPS ? (sp.by as StockGroup) : "branch";

  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  const [stock] = await db
    .select({ n: count() })
    .from(vehicles)
    .where(eq(vehicles.status, "in_stock"));
  const [activeInvoices] = await db
    .select({ n: count() })
    .from(invoices)
    .where(eq(invoices.status, "active"));

  let monthlyCashIn = "0";
  let receivables = "0";
  let leaders: Awaited<ReturnType<typeof topSalespeople>> = [];
  let branchBoard: Awaited<ReturnType<typeof topBranches>> = [];
  if (financial) {
    const now = new Date();
    [leaders, branchBoard] = await Promise.all([
      topSalespeople(now.getFullYear(), now.getMonth() + 1),
      topBranches(now.getFullYear(), now.getMonth() + 1),
    ]);
    const [cashIn] = await db
      .select({ s: sql<string>`coalesce(sum(${ledgerEntries.amount}), 0)` })
      .from(ledgerEntries)
      .where(and(eq(ledgerEntries.direction, "cash_in"), gte(ledgerEntries.entryDate, monthStartStr)));
    const [recv] = await db
      .select({ s: sql<string>`coalesce(sum(${invoices.balanceDue}), 0)` })
      .from(invoices)
      .where(eq(invoices.status, "active"));
    monthlyCashIn = cashIn.s;
    receivables = recv.s;
  }

  const fmt = (v: string) => `Rs. ${Number(v).toLocaleString("en-PK")}`;


  // Charts: aggregate-only, safe for any dashboard-capable role.
  const [trend, breakdown, byMake] = await Promise.all([
    salesTrend(range),
    stockBreakdown(group),
    stockByMake(),
  ]);
  const totalStock = breakdown.reduce((a, b) => a + b.value, 0);

  return (
    <div className="space-y-6">
      {/* Sir (2026-08-06): the greeting line went — "let's move some bikes"
          claimed something the screen doesn't do. The word "live" stays. */}
      <BikeHero
        title="Business Dashboard"
        subtitle="Live across every branch — stock, sales, cash and receivables."
      />

      <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Sir (2026-08-06): Customers tile dropped — four tiles fill the row
            exactly, and a headcount is not something you act on each morning. */}
        <StatCard title="Vehicles in Stock" value={stock.n} tone="forest" href="/inventory?status=in_stock" />
        <StatCard title="Active Invoices" value={activeInvoices.n} tone="burgundy" href="/sales" />
        {financial && (
          <>
            <StatCard
              title="Cash In (this month)"
              value={fmt(monthlyCashIn)}
              tone="brand"
              href="/ledger?direction=cash_in"
            />
            <StatCard
              title="Outstanding Receivables"
              value={fmt(receivables)}
              tone="bronze"
              href="/installments"
            />
          </>
        )}
      </div>

      {/* ---- Charts ---- */}
      <div id="charts" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">
              {financial ? "Revenue" : "Sales"} — {TREND_RANGES[range].label.toLowerCase()}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-ink-faint">
                {trend.reduce((a, t) => a + t.sales, 0)} sales in the period
              </span>
              <FilterPills
                param="range"
                active={range}
                keep={{ by: group }}
                options={Object.fromEntries(
                  Object.entries(TREND_RANGES).map(([k, v]) => [k, v.label.replace("Last ", "")]),
                )}
              />
            </div>
          </div>
          {trend.every((t) => t.sales === 0) ? (
            <EmptyState icon="📈" title="No sales in this period" hint="The curve appears as invoices are raised." />
          ) : (
            <AreaTrend
              data={trend.map((t) => ({ label: t.label, value: financial ? t.revenue : t.sales }))}
              format={(n) => (financial ? fmt(String(n)) : `${n} sales`)}
            />
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3">
            <h2 className="text-sm font-semibold">Stock Inventory</h2>
            <div className="mt-2">
              <FilterPills param="by" active={group} keep={{ range }} options={STOCK_GROUPS} />
            </div>
          </div>
          {breakdown.length === 0 ? (
            <EmptyState icon="🏍️" title="No vehicles in stock" hint="Record a delivery and units land here." action={{ label: "Record a delivery", href: "/deliveries" }} />
          ) : (
            <Donut slices={breakdown} centerValue={totalStock} centerLabel="units in stock" />
          )}
        </Card>
      </div>

      {byMake.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Stock Inventory — by company</h2>
          <BarList rows={byMake} format={(n) => `${n} unit${n === 1 ? "" : "s"}`} />
        </Card>
      )}

      {/* #22a: leaderboards — server-rendered, financial roles only */}
      {financial && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Board
            title="Top Salespeople (this month)"
            rows={leaders.map((l, i) => ({
              rank: i + 1,
              name: l.name,
              detail: `${l.salesCount} sale${l.salesCount === 1 ? "" : "s"}`,
              value: `Rs. ${Number(l.revenue).toLocaleString("en-PK")}`,
            }))}
          />
          <Board
            title="Top Branches (this month)"
            rows={branchBoard.map((b, i) => ({
              rank: i + 1,
              name: b.name,
              detail: `${b.salesCount} sale${b.salesCount === 1 ? "" : "s"}`,
              value: `Rs. ${Number(b.revenue).toLocaleString("en-PK")}`,
            }))}
          />
        </div>
      )}
    </div>
  );
}

function Board({ title, rows }: { title: string; rows: { rank: number; name: string; detail: string; value: string }[] }) {
  return (
    <Card className="overflow-hidden">
      <h2 className="border-b border-line px-5 py-3.5 text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <EmptyState icon="🏁" title="No sales recorded this month yet" hint="The leaderboard fills in as invoices are raised." />
      ) : (
        <ul>
          {rows.map((r) => (
            <li key={r.rank} className="row-hover flex items-center gap-3 border-b border-line px-5 py-3 text-sm last:border-0">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  r.rank === 1
                    ? "bg-amber-100 text-amber-700"
                    : "bg-brand-600 text-white"
                }`}
              >
                {r.rank}
              </span>
              <span className="flex-1 truncate font-medium">{r.name}</span>
              <span className="hidden text-xs text-ink-faint sm:inline">{r.detail}</span>
              <span className="font-semibold tabular-nums">{r.value}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
