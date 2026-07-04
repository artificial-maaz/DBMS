import { redirect } from "next/navigation";
import { canManageJobs, canUseWorkshop, listJobs, listMechanics, seesAllBranches } from "@/modules/workshop/service";
import { listCustomers } from "@/modules/customers/queries";
import { listActiveBranches } from "@/modules/inventory/queries";
import { requireStaff } from "@/lib/session";
import { CreateJobForm, JobActions } from "./workshop-forms";

const STATUS_BADGE: Record<string, string> = {
  open: "bg-slate-100 text-slate-700",
  in_progress: "bg-sky-100 text-sky-700",
  completed: "bg-emerald-100 text-emerald-700",
  delivered: "bg-indigo-100 text-indigo-700",
  cancelled: "bg-red-100 text-red-700",
};

export default async function WorkshopPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { profile } = await requireStaff();
  if (!canUseWorkshop(profile.role)) redirect("/dashboard");
  const params = await searchParams;
  const all = seesAllBranches(profile.role);
  const manager = canManageJobs(profile.role);

  const [jobs, customerRows, mechanics, branches] = await Promise.all([
    listJobs({ role: profile.role, ownBranchId: profile.branchId, status: params.status }),
    listCustomers({ role: profile.role, ownBranchId: profile.branchId }),
    listMechanics({ role: profile.role, ownBranchId: profile.branchId }),
    listActiveBranches(),
  ]);

  const fmt = (v: string) => `Rs. ${Number(v).toLocaleString("en-PK")}`;
  const active = jobs.filter((j) => j.status === "open" || j.status === "in_progress").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Workshop — Repair Queue
          {active > 0 && (
            <span className="ml-2 rounded-full bg-sky-100 px-2.5 py-0.5 text-sm font-medium text-sky-700">
              {active} active
            </span>
          )}
        </h1>
        <CreateJobForm
          customers={customerRows.map((c) => ({ id: c.id, label: `${c.fullName} (${c.phone})` }))}
          mechanics={mechanics.map((m) => ({ id: m.userId, label: m.name }))}
          branches={branches.map((b) => ({ id: b.id, label: b.name }))}
          fixedBranchId={all ? null : profile.branchId}
        />
      </div>

      <form method="get" className="flex gap-3">
        <select name="status" defaultValue={params.status ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">
          <option value="">All statuses</option>
          {Object.keys(STATUS_BADGE).map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
        <button className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm text-white hover:bg-slate-700">Filter</button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Job #</th>
              <th className="px-4 py-3">Customer / Bike</th>
              <th className="px-4 py-3">Complaint</th>
              <th className="px-4 py-3">Mechanic</th>
              <th className="px-4 py-3">Warranty</th>
              <th className="px-4 py-3 text-right">Charges</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  No job cards yet — the bench is clean.
                </td>
              </tr>
            )}
            {jobs.map((j) => (
              <tr key={j.id} className="border-t border-slate-100 align-top hover:bg-slate-50">
                <td className="px-4 py-2.5 font-mono text-xs font-medium text-indigo-700">{j.jobNo}</td>
                <td className="px-4 py-2.5">
                  <span className="font-medium">{j.customerName}</span>
                  <span className="block font-mono text-xs text-slate-400">{j.chassisNo}</span>
                </td>
                <td className="max-w-xs px-4 py-2.5">
                  <span className="line-clamp-2 text-slate-600">{j.complaints}</span>
                </td>
                <td className="px-4 py-2.5">{j.mechanicName ?? <span className="text-slate-400">—</span>}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      j.warrantyStatus === "free_coupon"
                        ? "bg-amber-100 text-amber-700"
                        : j.warrantyStatus === "in_warranty"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {j.warrantyStatus === "free_coupon" ? `coupon #${j.couponNo}` : j.warrantyStatus.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {fmt(String(Number(j.laborCharge) + Number(j.partsCharge)))}
                  {j.warrantyStatus === "free_coupon" && Number(j.laborCharge) > 0 && (
                    <span className="block text-xs text-amber-600">labor waived</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[j.status]}`}>
                    {j.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <JobActions jobId={j.id} status={j.status} isManager={manager} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
