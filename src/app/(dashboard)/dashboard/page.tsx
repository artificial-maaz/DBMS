import Link from "next/link";
import { and, count, eq, gte, sql } from "drizzle-orm";
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
  if (financial) {
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
