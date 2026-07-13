import Link from "next/link";
import { and, count, eq, gte, sql } from "drizzle-orm";
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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Business Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Vehicles in Stock" value={String(stock.n)} accent="bg-indigo-600" href="/inventory?status=in_stock" />
        <Card title="Active Invoices" value={String(activeInvoices.n)} accent="bg-sky-600" href="/sales" />
        <Card title="Customers" value={String(customerCount.n)} accent="bg-slate-600" href="/customers" />
        {financial && (
          <>
            <Card title="Cash In (this month)" value={fmt(monthlyCashIn)} accent="bg-emerald-600" href="/ledger?direction=cash_in" />
            <Card title="Outstanding Receivables" value={fmt(receivables)} accent="bg-amber-600" href="/sales" />
          </>
        )}
      </div>

      {/* #22a: leaderboards — server-rendered, financial roles only */}
      {financial && (leaders.length > 0 || branchBoard.length > 0) && (
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
    <div className="rounded-xl border border-slate-200 bg-white">
      <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">{title}</h2>
      <ul className="divide-y divide-slate-50">
        {rows.map((r) => (
          <li key={r.rank} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              r.rank === 1 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
            }`}>
              {r.rank}
            </span>
            <span className="flex-1 font-medium">{r.name}</span>
            <span className="text-xs text-slate-400">{r.detail}</span>
            <span className="font-semibold">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Card({ title, value, accent, href }: { title: string; value: string; accent: string; href: string }) {
  return (
    <Link
      href={href}
      className={`block rounded-xl ${accent} p-5 text-white shadow-sm transition hover:scale-[1.02] hover:shadow-md`}
    >
      <p className="text-sm/5 opacity-80">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Link>
  );
}
