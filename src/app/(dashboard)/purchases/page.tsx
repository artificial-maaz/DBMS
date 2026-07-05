import { redirect } from "next/navigation";
import { canProcure, listPurchases, listSuppliers } from "@/modules/procurement/service";
import { listActiveBranches } from "@/modules/inventory/queries";
import { requireStaff } from "@/lib/session";
import { PayPurchase, RecordPurchaseForm } from "./purchase-forms";

export default async function PurchasesPage() {
  const { profile } = await requireStaff();
  if (!canProcure(profile.role)) redirect("/dashboard");

  const [rows, supplierRows, branches] = await Promise.all([
    listPurchases(),
    listSuppliers(),
    listActiveBranches(),
  ]);

  const fmt = (v: string | number) => `Rs. ${Number(v).toLocaleString("en-PK")}`;
  const totalOutstanding = rows.reduce((a, r) => a + (Number(r.totalCost) - Number(r.amountPaid)), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Stock Purchases</h1>
        <RecordPurchaseForm
          suppliers={supplierRows.map((s) => ({ id: s.id, label: s.name }))}
          branches={branches.map((b) => ({ id: b.id, label: b.name }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <div className="rounded-xl bg-slate-800 p-5 text-white">
          <p className="text-sm opacity-80">Purchase Orders</p>
          <p className="mt-1 text-2xl font-semibold">{rows.length}</p>
        </div>
        <div className={`rounded-xl p-5 text-white ${totalOutstanding > 0 ? "bg-amber-600" : "bg-emerald-700"}`}>
          <p className="text-sm opacity-80">Payable to Suppliers</p>
          <p className="mt-1 text-2xl font-semibold">{fmt(totalOutstanding)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">PO #</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Outstanding</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                  No stock purchases recorded yet.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const outstanding = Number(r.totalCost) - Number(r.amountPaid);
              return (
                <tr key={r.id} className="border-t border-slate-100 align-top hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-xs font-medium text-indigo-700">{r.poNo}</td>
                  <td className="px-4 py-2.5 font-medium">{r.supplierName}</td>
                  <td className="max-w-xs px-4 py-2.5">
                    <span className="line-clamp-2 text-slate-600">{r.description}</span>
                  </td>
                  <td className="px-4 py-2.5">{r.branchName}</td>
                  <td className="px-4 py-2.5 text-slate-500">{new Date(r.purchaseDate).toLocaleDateString("en-PK")}</td>
                  <td className="px-4 py-2.5 text-right">{fmt(r.totalCost)}</td>
                  <td className="px-4 py-2.5 text-right text-emerald-600">{fmt(r.amountPaid)}</td>
                  <td className={`px-4 py-2.5 text-right ${outstanding > 0 ? "font-medium text-amber-600" : "text-slate-400"}`}>
                    {fmt(outstanding)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <PayPurchase poId={r.id} outstanding={outstanding} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
