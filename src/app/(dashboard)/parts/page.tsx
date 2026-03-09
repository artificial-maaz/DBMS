import { redirect } from "next/navigation";
import { canManageParts, canSeeCostPrice, canViewParts, listParts, seesAllBranches } from "@/modules/parts/service";
import { listActiveBranches } from "@/modules/inventory/queries";
import { StatCard } from "@/components/ui";
import { requireStaff } from "@/lib/session";
import { AddPartForm, AdjustStock } from "./part-forms";

export default async function PartsPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>;
}) {
  const { profile } = await requireStaff();
  if (!canViewParts(profile.role)) redirect("/dashboard");
  const params = await searchParams;
  const showCost = canSeeCostPrice(profile.role);
  const manager = canManageParts(profile.role);
  const all = seesAllBranches(profile.role);

  const [rows, branches] = await Promise.all([
    listParts({
      role: profile.role,
      ownBranchId: profile.branchId,
      branchId: params.branch ? Number(params.branch) : undefined,
    }),
    listActiveBranches(),
  ]);

  const fmt = (v: string | null | undefined) =>
    v == null ? "—" : `Rs. ${Number(v).toLocaleString("en-PK")}`;
  const totalUnits = rows.reduce((a, r) => a + r.currentQty, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Spare Parts</h1>
        {manager && (
          <AddPartForm
            branches={branches.map((b) => ({ id: b.id, name: b.name }))}
            showCost={showCost}
            fixedBranchId={all ? null : profile.branchId}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <StatCard title="Catalog Items" value={rows.length} tone="forest" />
        <StatCard title="Total Units in Stock" value={totalUnits} tone="burgundy" />
      </div>

      {all && (
        <form method="get" className="flex gap-3">
          <select name="branch" defaultValue={params.branch ?? ""} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm">
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-500">Filter</button>
        </form>
      )}

      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-raised text-left text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-3">Part</th>
              <th className="px-4 py-3">Part No. / SKU</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3 text-right">Stock</th>
              {showCost && <th className="px-4 py-3 text-right">Cost</th>}
              <th className="px-4 py-3 text-right">Retail</th>
              {manager && <th className="px-4 py-3 text-right">Action</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={manager ? 7 : 6} className="px-4 py-10 text-center text-ink-faint">
                  No spare parts registered yet.
                </td>
              </tr>
            )}
            {rows.map((p) => {
              const low = p.currentQty <= p.lowStockAt;
              return (
                <tr key={p.id} className="border-t border-line row-hover">
                  <td className="px-4 py-2.5 font-medium">{p.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-faint">
                    {p.partNo ?? "—"}{p.sku ? ` · ${p.sku}` : ""}
                  </td>
                  <td className="px-4 py-2.5">{p.branchName}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.currentQty === 0
                          ? "bg-red-100 text-red-700"
                          : low
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {p.currentQty} {p.currentQty === 0 ? "· out" : low ? "· low" : ""}
                    </span>
                  </td>
                  {showCost && <td className="px-4 py-2.5 text-right">{fmt(p.costPrice)}</td>}
                  <td className="px-4 py-2.5 text-right">{fmt(p.retailPrice)}</td>
                  {manager && (
                    <td className="px-4 py-2.5 text-right">
                      <AdjustStock partId={p.id} currentQty={p.currentQty} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
