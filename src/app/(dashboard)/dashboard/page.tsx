import { and, count, eq, gte, sql } from "drizzle-orm";
import { BikeHero } from "@/components/bike-hero";
import { AreaTrend, BarList, Donut } from "@/components/charts";
import { Card, EmptyState, StatCard } from "@/components/ui";
import { salesTrend, stockByBranch, stockByMake } from "@/modules/dashboard/queries";
import { topBranches, topSalespeople } from "@/modules/reports/queries";
import { db } from "@/db";
import { customers, invoices, ledgerEntries, vehicles } from "@/db/schema";
import { canSeeFinancials, requireStaff } from "@/lib/session";

/**
 * KPI dashboard. Financial cards render ONLY for Creator/Owners —
 * this is a server component, so restricted numbers never even leave
 * the server for employee sessions (RBAC rule, not CSS hiding).
 */
export default async function DashboardPage() {
  const { profile } = await requireStaff();
  const financial = canSeeFinancials(profile.role);

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
  const [customerCount] = await db.select({ n: count() }).from(customers);

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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Charts: aggregate-only, safe for any dashboard-capable role.
  const [trend, byBranch, byMake] = await Promise.all([salesTrend(6), stockByBranch(), stockByMake()]);
  const totalStock = byBranch.reduce((a, b) => a + b.value, 0);

  return (
    <div className="space-y-6">
      <BikeHero
        title={`${greeting}, let's move some bikes`}
        subtitle="Everything below is live — no refresh needed, no spreadsheets to reconcile."
      />

      <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Vehicles in Stock" value={stock.n} tone="brand" href="/inventory?status=in_stock" />
        <StatCard title="Active Invoices" value={activeInvoices.n} tone="sky" href="/sales" />
        <StatCard title="Customers" value={customerCount.n} tone="slate" href="/customers" />
        {financial && (
          <>
            <StatCard
              title="Cash In (this month)"
              value={fmt(monthlyCashIn)}
              tone="emerald"
              href="/ledger?direction=cash_in"
            />
            <StatCard
              title="Outstanding Receivables"
              value={fmt(receivables)}
              hint="Owed to us across active invoices"
              tone="amber"
              href="/installments"
            />
          </>
        )}
      </div>

      {/* ---- Charts ---- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">
              {financial ? "Revenue — last 6 months" : "Sales — last 6 months"}
            </h2>
            <span className="text-xs text-ink-faint">
              {trend.reduce((a, t) => a + t.sales, 0)} sales in the period
            </span>
          </div>
          {trend.every((t) => t.sales === 0) ? (
            <EmptyState icon="📈" title="No sales in the last six months" hint="The curve appears as invoices are raised." />
          ) : (
            <AreaTrend
              data={trend.map((t) => ({ label: t.label, value: financial ? t.revenue : t.sales }))}
              format={(n) => (financial ? fmt(String(n)) : `${n} sales`)}
            />
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Stock by branch</h2>
          {byBranch.length === 0 ? (
            <EmptyState icon="🏍️" title="No vehicles in stock" hint="Record a delivery and units land here." action={{ label: "Record a delivery", href: "/deliveries" }} />
          ) : (
            <Donut slices={byBranch} centerValue={totalStock} centerLabel="units on the floor" />
          )}
        </Card>
      </div>

      {byMake.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">What&apos;s on the floor, by make</h2>
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
                    ? "bg-amber-100 text-amber-700 ring-2 ring-amber-200"
                    : "bg-brand-50 text-brand-700"
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
