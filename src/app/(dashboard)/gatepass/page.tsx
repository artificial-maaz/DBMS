import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { canUseGatePass, listGatePasses, seesAllBranches } from "@/modules/gatepass/service";
import { listActiveBranches } from "@/modules/inventory/queries";
import { requireStaff } from "@/lib/session";
import { IssuePassForm, PassActions } from "./gatepass-forms";

const STATUS_BADGE: Record<string, string> = {
  in_transit: "bg-amber-100 text-amber-700",
  received: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

export default async function GatePassPage() {
  const { profile } = await requireStaff();
  if (!canUseGatePass(profile.role)) redirect("/dashboard");
  const all = seesAllBranches(profile.role);

  const [passes, branchList, stock] = await Promise.all([
    listGatePasses({ role: profile.role, ownBranchId: profile.branchId }),
    listActiveBranches(),
    db
      .select({
        id: vehicles.id,
        make: vehicles.make,
        model: vehicles.model,
        chassisNo: vehicles.chassisNo,
        branchId: vehicles.branchId,
      })
      .from(vehicles)
      .where(eq(vehicles.status, "in_stock")),
  ]);

  const transferable = all ? stock : stock.filter((v) => v.branchId === profile.branchId);
  const counts = {
    in_transit: passes.filter((p) => p.status === "in_transit").length,
    received: passes.filter((p) => p.status === "received").length,
    cancelled: passes.filter((p) => p.status === "cancelled").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Gate Passes</h1>
        <IssuePassForm
          vehicles={transferable.map((v) => ({
            id: v.id,
            label: `${v.make} ${v.model} — ${v.chassisNo}`,
            branchId: v.branchId,
          }))}
          branches={branchList.map((b) => ({ id: b.id, label: b.name }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="In Transit / Pending" value={counts.in_transit} cls="bg-amber-500" />
        <Card title="Completed Transfers" value={counts.received} cls="bg-emerald-600" />
        <Card title="Cancelled" value={counts.cancelled} cls="bg-red-600" />
      </div>

      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-raised text-left text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-3">Pass #</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">From → To</th>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {passes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-faint">
                  No gate passes yet — issue one to move a vehicle between branches.
                </td>
              </tr>
            )}
            {passes.map((p) => {
              const canReceive =
                p.status === "in_transit" && (all || p.destBranchId === profile.branchId);
              const canCancel =
                p.status === "in_transit" && (all || p.sourceBranchId === profile.branchId);
              return (
                <tr key={p.id} className="border-t border-line row-hover">
                  <td className="px-4 py-2.5 font-mono text-xs font-medium text-brand-700">{p.passNo}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{p.vehicleLabel}</span>
                    <span className="block font-mono text-xs text-ink-faint">{p.chassisNo}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {p.sourceName} <span className="text-ink-faint">→</span> {p.destName}
                  </td>
                  <td className="px-4 py-2.5">
                    {p.driverName}
                    {p.transportPlate && (
                      <span className="block font-mono text-xs text-ink-faint">{p.transportPlate}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-ink-faint">
                    {new Date(p.issuedAt).toLocaleDateString("en-PK")}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status]}`}>
                      {p.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <PassActions passId={p.id} canReceive={canReceive} canCancel={canCancel} />
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

function Card({ title, value, cls }: { title: string; value: number; cls: string }) {
  return (
    <div className={`rounded-xl ${cls} p-5 text-white shadow-sm`}>
      <p className="text-sm opacity-80">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
