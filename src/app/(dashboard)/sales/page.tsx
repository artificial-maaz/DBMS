import Link from "next/link";
import { canCreateSale } from "@/modules/sales/permissions";
import { listInvoices } from "@/modules/sales/queries";
import { requireStaff } from "@/lib/session";

const PLAN_BADGE: Record<string, string> = {
  cash: "bg-emerald-100 text-emerald-700",
  installment: "bg-amber-100 text-amber-700",
};
const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  settled: "bg-sky-100 text-sky-700",
  cancelled: "bg-red-100 text-red-700",
};

export default async function SalesPage() {
  const { profile } = await requireStaff();
  const rows = await listInvoices({ role: profile.role, ownBranchId: profile.branchId });

  const fmt = (v: string) => `Rs. ${Number(v).toLocaleString("en-PK")}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sales & Invoices</h1>
        {canCreateSale(profile.role) && (
          <Link
            href="/sales/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            + New Sale
          </Link>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Downpayment</th>
              <th className="px-4 py-3">Balance Due</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                  No sales yet — hit “New Sale” to make history.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-mono text-xs font-medium">
                  <Link href={`/sales/${r.id}`} className="text-indigo-700 hover:underline">
                    {r.invoiceNo}
                  </Link>
                </td>
                <td className="px-4 py-2.5">{r.customerName}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_BADGE[r.settlementPlan]}`}>
                    {r.settlementPlan}
                  </span>
                </td>
                <td className="px-4 py-2.5">{fmt(r.total)}</td>
                <td className="px-4 py-2.5">{fmt(r.downpayment)}</td>
                <td className="px-4 py-2.5 text-red-600">{fmt(r.balanceDue)}</td>
                <td className="px-4 py-2.5">{r.branchName}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-500">
                  {new Date(r.createdAt).toLocaleDateString("en-PK")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
