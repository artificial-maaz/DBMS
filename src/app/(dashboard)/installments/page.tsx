import Link from "next/link";
import { redirect } from "next/navigation";
import { canViewInstallmentCases, seesAllBranches } from "@/modules/installments/permissions";
import { listInstallmentCases, type CaseStatus } from "@/modules/installments/queries";
import { listActiveBranches } from "@/modules/inventory/queries";
import { StatCard } from "@/components/ui";
import { requireStaff } from "@/lib/session";

/**
 * #16 (Sir, 2026-08-09): the old `bg-red-100 / text-red-700` overdue badge was
 * a fire-engine red fighting the burgundy KPI tile behind it, and the sky blue
 * shifted hue between themes so "on track" read as a different colour in dark
 * mode. Both now come off the semantic status ramp, which keeps one hue per
 * meaning across both themes and tones the danger colour into the same family
 * as the burgundy rather than shouting over it.
 */
const STATUS_BADGE: Record<CaseStatus, string> = {
  cleared: "bg-ok-soft text-ok",
  on_track: "bg-info-soft text-info",
  overdue: "bg-danger-soft text-danger",
};
const STATUS_LABEL: Record<CaseStatus, string> = {
  cleared: "cleared",
  on_track: "on track",
  overdue: "overdue",
};

/**
 * Installment Cases (Sir #3, 2026-07-31) — the receivables control tower.
 * Every installment sale in one place with its live status, so "who isn't
 * paying on time" is a glance, not an investigation.
 */
export default async function InstallmentCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: CaseStatus; branch?: string }>;
}) {
  const { profile } = await requireStaff();
  if (!canViewInstallmentCases(profile.role)) redirect("/dashboard");
  const params = await searchParams;
  const all = seesAllBranches(profile.role);

  const [cases, branches] = await Promise.all([
    listInstallmentCases({
      role: profile.role,
      ownBranchId: profile.branchId,
      branchId: params.branch ? Number(params.branch) : undefined,
      status: params.status,
    }),
    listActiveBranches(),
  ]);

  const fmt = (v: string | number) => `Rs. ${Number(v).toLocaleString("en-PK")}`;

  // KPI cards are computed over the CURRENT filter so the numbers always
  // match the table beneath them.
  const kpi = {
    total: cases.length,
    cleared: cases.filter((c) => c.status === "cleared").length,
    onTrack: cases.filter((c) => c.status === "on_track").length,
    overdue: cases.filter((c) => c.status === "overdue").length,
    receivable: cases.reduce((a, c) => a + Number(c.balanceDue), 0),
    overdueAmount: cases.reduce((a, c) => a + Number(c.overdueAmount), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Installment Cases</h1>
        <Link href="/sales" className="text-sm text-ink-faint hover:text-ink">
          Sales &amp; Invoices →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Total Cases" value={kpi.total} tone="graphite" />
        <StatCard title="Cleared" value={kpi.cleared} tone="forest" />
        <StatCard title="On Track" value={kpi.onTrack} tone="brand" />
        <StatCard title="Overdue" value={kpi.overdue} tone="burgundy" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-ink-faint">Outstanding Receivable</p>
          <p className="mt-1 text-2xl font-semibold">{fmt(kpi.receivable)}</p>
          <p className="mt-1 text-xs text-ink-faint">Everything still owed to us across these cases.</p>
        </div>
        <div className="rounded-xl border border-danger/25 bg-danger-soft px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-danger">Past Due Right Now</p>
          <p className="mt-1 text-2xl font-semibold text-danger">{fmt(kpi.overdueAmount)}</p>
          <p className="mt-1 text-xs text-danger/80">Instalments whose due date has already passed — chase these.</p>
        </div>
      </div>

      <form method="get" className="flex flex-wrap gap-3">
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="overdue">Overdue</option>
          <option value="on_track">On track</option>
          <option value="cleared">Cleared</option>
        </select>
        {all && (
          <select
            name="branch"
            defaultValue={params.branch ?? ""}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
        <button className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-500">Filter</button>
      </form>

      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-raised text-left text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Collected</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3">Next / Overdue</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {cases.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-ink-faint">
                  No installment cases match this filter.
                </td>
              </tr>
            )}
            {cases.map((c) => (
              <tr key={c.id} className={`border-t border-line row-hover ${c.status === "overdue" ? "bg-danger-soft/50" : ""}`}>
                <td className="px-4 py-2.5 font-mono text-xs font-medium">
                  <Link href={`/sales/${c.id}`} className="text-brand-700 hover:underline">{c.invoiceNo}</Link>
                  <span className="block text-ink-faint">{new Date(c.saleDate).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi" })}</span>
                </td>
                <td className="px-4 py-2.5">
                  <Link href={`/customers/${c.customerId}`} className="font-medium text-brand-700 hover:underline">
                    {c.customerName}
                  </Link>
                  <span className="block text-xs text-ink-faint">{c.customerPhone}</span>
                </td>
                <td className="px-4 py-2.5">{c.branchName}</td>
                <td className="px-4 py-2.5">
                  <span className="font-medium">{c.paidInstallments}/{c.totalInstallments}</span>
                  <span className="block text-xs text-ink-faint">instalments paid</span>
                </td>
                <td className="px-4 py-2.5 text-right">{fmt(c.total)}</td>
                <td className="px-4 py-2.5 text-right text-ok">
                  {fmt(Number(c.downpayment) + Number(c.totalPaid))}
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-danger">{fmt(c.balanceDue)}</td>
                <td className="px-4 py-2.5">
                  {c.status === "overdue" ? (
                    <span className="text-danger">
                      <span className="font-medium">{c.daysOverdue} days late</span>
                      <span className="block text-xs">
                        {c.overdueCount} unpaid · {fmt(c.overdueAmount)}
                      </span>
                    </span>
                  ) : c.nextDueDate ? (
                    <span className="text-ink-soft">
                      {new Date(c.nextDueDate).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi" })}
                      <span className="block text-xs text-ink-faint">next due</span>
                    </span>
                  ) : (
                    <span className="text-ink-faint">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[c.status]}`}>
                    {STATUS_LABEL[c.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink-faint">
        Status is computed live: <span className="font-medium">cleared</span> = nothing left owed ·{" "}
        <span className="font-medium">overdue</span> = at least one instalment past its due date and unpaid ·{" "}
        <span className="font-medium">on track</span> = everything due so far has been collected. Collect payments from
        the invoice page.
      </p>
    </div>
  );
}

