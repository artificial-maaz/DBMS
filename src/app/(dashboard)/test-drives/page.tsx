import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { canUseTestDrives, canViewTestDrives, listTestDrives, seesAllBranches } from "@/modules/testdrives/service";
import { listCustomers } from "@/modules/customers/queries";
import { listActiveBranches } from "@/modules/inventory/queries";
import { requireStaff } from "@/lib/session";
import { BookTestDriveForm, RideActions } from "./testdrive-forms";

const STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-sky-100 text-sky-700",
  completed: "bg-emerald-100 text-emerald-700",
  no_show: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
};

export default async function TestDrivesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { user, profile } = await requireStaff();
  if (!canViewTestDrives(profile.role)) redirect("/dashboard");
  const params = await searchParams;
  const all = seesAllBranches(profile.role);
  const usable = canUseTestDrives(profile.role); // assistants: watch-only

  const [rides, customerRows, branches, stock] = await Promise.all([
    listTestDrives({ role: profile.role, ownBranchId: profile.branchId, ownUserId: user.id, status: params.status }),
    listCustomers({ role: profile.role, ownBranchId: profile.branchId }),
    listActiveBranches(),
    db
      .select({ id: vehicles.id, make: vehicles.make, model: vehicles.model, chassisNo: vehicles.chassisNo, branchId: vehicles.branchId })
      .from(vehicles)
      .where(eq(vehicles.status, "in_stock")),
  ]);

  // Cross-branch ops (2026-07-31): any branch's stock is rideable; label carries branch.
  const rideable = stock;
  const branchName = (id: number) => branches.find((b) => b.id === id)?.name ?? "?";
  const now = Date.now();
  const upcoming = rides.filter((r) => r.status === "scheduled" && new Date(r.scheduledAt).getTime() >= now).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Test Drives
          {upcoming > 0 && (
            <span className="ml-2 rounded-full bg-sky-100 px-2.5 py-0.5 text-sm font-medium text-sky-700">
              {upcoming} upcoming
            </span>
          )}
        </h1>
        {usable && (
          <BookTestDriveForm
            customers={customerRows.map((c) => ({ id: c.id, label: `${c.fullName} (${c.phone})` }))}
            vehicles={rideable.map((v) => ({
              id: v.id,
              label:
                !all && v.branchId !== profile.branchId
                  ? `${v.make} ${v.model} — ${v.chassisNo} (${branchName(v.branchId)})`
                  : `${v.make} ${v.model} — ${v.chassisNo}`,
            }))}
            branches={branches.map((b) => ({ id: b.id, label: b.name }))}
            fixedBranchId={null}
            defaultBranchId={all ? null : profile.branchId}
          />
        )}
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
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Rider</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Booked By</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rides.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  No test drives yet — book the first spin.
                </td>
              </tr>
            )}
            {rides.map((r) => {
              const overdue = r.status === "scheduled" && new Date(r.scheduledAt).getTime() < now;
              return (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className={`whitespace-nowrap px-4 py-2.5 ${overdue ? "font-medium text-red-600" : "text-slate-600"}`}>
                    {new Date(r.scheduledAt).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
                    {overdue && <span className="block text-xs">past due — mark outcome</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{r.personName}</span>
                    <span className="block text-xs text-slate-400">
                      {r.phone}
                      {r.customerId ? " · customer" : r.visitorId ? " · lead" : " · walk-in"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {r.vehicleMake ? `${r.vehicleMake} ${r.vehicleModel}` : (r.vehicleText ?? "—")}
                  </td>
                  <td className="px-4 py-2.5">{r.branchName}</td>
                  <td className="px-4 py-2.5 text-slate-500">{r.bookedBy ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}>
                      {r.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {usable ? <RideActions id={r.id} status={r.status} /> : <span className="text-xs text-slate-400">—</span>}
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
