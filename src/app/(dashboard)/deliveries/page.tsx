import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { canRecordDelivery, canSeeUnitCost, canViewDeliveries, seesAllBranches } from "@/modules/deliveries/permissions";
import { listDeliveries } from "@/modules/deliveries/queries";
import { listActiveBranches } from "@/modules/inventory/queries";
import { StatCard } from "@/components/ui";
import { requireStaff } from "@/lib/session";
import { AddDeliveryForm } from "./delivery-form";

/**
 * Stock Deliveries (Sir #4) — every inbound consignment, with how many units
 * arrived and how many have since sold. Open one to see each unit's lifecycle.
 */
export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>;
}) {
  const { profile } = await requireStaff();
  if (!canViewDeliveries(profile.role)) redirect("/dashboard");
  const params = await searchParams;
  const all = seesAllBranches(profile.role);

  const [rows, branches, supplierRows] = await Promise.all([
    listDeliveries({
      role: profile.role,
      ownBranchId: profile.branchId,
      branchId: params.branch ? Number(params.branch) : undefined,
    }),
    listActiveBranches(),
    db.query.suppliers.findMany({
      where: (s, { eq }) => eq(s.isActive, true),
      orderBy: (s, { asc }) => asc(s.name),
    }),
  ]);

  const totalUnits = rows.reduce((a, r) => a + r.units, 0);
  const totalSold = rows.reduce((a, r) => a + r.soldUnits, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Stock Deliveries</h1>
        {canRecordDelivery(profile.role) && (
          <AddDeliveryForm
            branches={branches.map((b) => ({ id: b.id, name: b.name }))}
            suppliers={supplierRows.map((s) => ({ id: s.id, name: s.name }))}
            defaultBranchId={all ? null : profile.branchId}
            showCost={canSeeUnitCost(profile.role)}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Consignments" value={rows.length} tone="graphite" />
        <StatCard title="Units Received" value={totalUnits} tone="brand" />
        <StatCard title="Units Sold" value={totalSold} tone="forest" />
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
              <th className="px-4 py-3">Delivery #</th>
              <th className="px-4 py-3">Company / Supplier</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Challan / Batch</th>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Units</th>
              <th className="px-4 py-3">Sold</th>
              <th className="px-4 py-3">Received By</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-ink-faint">
                  No deliveries recorded yet — register a consignment and its units land in inventory automatically.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line row-hover">
                <td className="px-4 py-2.5 font-mono text-xs font-medium">
                  <Link href={`/deliveries/${r.id}`} className="text-brand-700 hover:underline">{r.deliveryNo}</Link>
                </td>
                <td className="px-4 py-2.5 font-medium">{r.supplierName}</td>
                <td className="px-4 py-2.5">{r.branchName}</td>
                <td className="px-4 py-2.5 text-ink-faint">
                  {r.challanNo ?? "—"}
                  {r.batchRef && <span className="block text-xs">batch {r.batchRef}</span>}
                </td>
                <td className="px-4 py-2.5 text-ink-faint">{new Date(r.deliveredOn).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi" })}</td>
                <td className="px-4 py-2.5 font-medium">{r.units}</td>
                <td className="px-4 py-2.5">
                  <span className={r.soldUnits === r.units && r.units > 0 ? "font-medium text-emerald-700" : ""}>
                    {r.soldUnits}
                  </span>
                  <span className="text-ink-faint"> / {r.units}</span>
                </td>
                <td className="px-4 py-2.5 text-ink-faint">{r.receivedByName ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

