import { redirect } from "next/navigation";
import { canManageAssets, canViewAssets, listAssets } from "@/modules/assets/service";
import { listActiveBranches } from "@/modules/inventory/queries";
import { requireStaff } from "@/lib/session";
import { AddAssetForm, ToggleAsset } from "./asset-forms";

export default async function AssetsPage() {
  const { profile } = await requireStaff();
  if (!canViewAssets(profile.role)) redirect("/dashboard");
  const manager = canManageAssets(profile.role);

  const [rows, branches] = await Promise.all([listAssets(), listActiveBranches()]);
  const fmt = (v: string | number) => `Rs. ${Number(v).toLocaleString("en-PK")}`;
  const totalValue = rows.filter((r) => r.isActive).reduce((a, r) => a + r.qty * Number(r.unitValue), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Branch Fixed Assets</h1>
        {manager && <AddAssetForm branches={branches.map((b) => ({ id: b.id, name: b.name }))} />}
      </div>

      <div className="max-w-xs rounded-xl bg-slate-800 p-5 text-white">
        <p className="text-sm opacity-80">Total Active Asset Value</p>
        <p className="mt-1 text-2xl font-semibold">{fmt(totalValue)}</p>
        <p className="mt-1 text-xs opacity-60">Feeds the Balance Sheet's Fixed Assets line</p>
      </div>

      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-raised text-left text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Unit Value</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Status</th>
              {manager && <th className="px-4 py-3 text-right">Action</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={manager ? 8 : 7} className="px-4 py-10 text-center text-ink-faint">No assets registered yet.</td></tr>
            )}
            {rows.map((a) => (
              <tr key={a.id} className={`border-t border-line row-hover ${!a.isActive ? "opacity-50" : ""}`}>
                <td className="px-4 py-2.5">{a.branchName}</td>
                <td className="px-4 py-2.5 font-medium">{a.name}</td>
                <td className="px-4 py-2.5"><span className="rounded-full bg-raised px-2 py-0.5 text-xs text-ink-soft">{a.category}</span></td>
                <td className="px-4 py-2.5 text-right">{a.qty}</td>
                <td className="px-4 py-2.5 text-right">{fmt(a.unitValue)}</td>
                <td className="px-4 py-2.5 text-right font-medium">{fmt(a.qty * Number(a.unitValue))}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.isActive ? "bg-emerald-100 text-emerald-700" : "bg-raised text-ink-faint"}`}>
                    {a.isActive ? "active" : "retired"}
                  </span>
                </td>
                {manager && <td className="px-4 py-2.5 text-right"><ToggleAsset id={a.id} isActive={a.isActive} /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
