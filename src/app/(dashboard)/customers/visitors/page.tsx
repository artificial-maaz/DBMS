import { canConvertVisitor, canCreateVisitor, canEditVisitor, canViewVisitors, seesAllBranches } from "@/modules/visitors/permissions";
import { listVisitors } from "@/modules/visitors/queries";
import { listActiveBranches } from "@/modules/inventory/queries";
import { requireStaff } from "@/lib/session";
import { redirect } from "next/navigation";
import { CustomerTabs } from "../tabs";
import { AddVisitorForm } from "./add-visitor-form";
import { EditVisitorForm } from "./edit-visitor-form";
import { ConvertVisitor } from "./convert-visitor";

const SOURCE_LABEL: Record<string, string> = {
  walk_in: "Walk-in",
  event: "Event / Stall",
  referral: "Referral",
  online: "Online",
};
const STATUS_BADGE: Record<string, string> = {
  new: "bg-sky-100 text-sky-700",
  contacted: "bg-amber-100 text-amber-700",
  follow_up: "bg-brand-100 text-brand-700",
  converted: "bg-emerald-100 text-emerald-700",
  lost: "bg-raised text-ink-faint",
};

export default async function VisitorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { profile } = await requireStaff();
  if (!canViewVisitors(profile.role)) redirect("/dashboard");
  const params = await searchParams;

  const [rows, branches] = await Promise.all([
    listVisitors({ role: profile.role, ownBranchId: profile.branchId, q: params.q }),
    listActiveBranches(),
  ]);

  const creatable = canCreateVisitor(profile.role);
  const editable = canEditVisitor(profile.role);
  const convertible = canConvertVisitor(profile.role);
  // Cross-branch ops (2026-07-31): visitor create is a free branch choice (default own);
  // edit stays scoped to rows they can already see.
  const fixedBranchId = seesAllBranches(profile.role) ? null : profile.branchId;
  const defaultBranchId = fixedBranchId;
  const today = new Date().toISOString().slice(0, 10);
  const fmt = (v: string | null) => (v == null ? "—" : `Rs. ${Number(v).toLocaleString("en-PK")}`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Visitors & Leads</h1>
        {creatable && <AddVisitorForm branches={branches.map((b) => ({ id: b.id, name: b.name }))} fixedBranchId={null} defaultBranchId={defaultBranchId} />}
      </div>

      <CustomerTabs active="visitors" />

      <form method="get" className="flex gap-3">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search name, phone, interest…"
          className="w-72 rounded-lg border border-line px-3 py-1.5 text-sm outline-none focus:border-brand-500"
        />
        <button className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-500">Search</button>
      </form>

      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-raised text-left text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Interested In</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Follow-up</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-ink-faint">
                  No visitors logged yet — walk-ins and event leads go here, separate from customers.
                </td>
              </tr>
            )}
            {rows.map((v) => {
              const overdue = !!v.followUpDate && v.followUpDate < today && !["converted", "lost"].includes(v.status);
              return (
                <tr key={v.id} className="border-t border-line row-hover">
                  <td className="px-4 py-2.5 font-medium">{v.fullName}</td>
                  <td className="px-4 py-2.5">{v.phone}</td>
                  <td className="px-4 py-2.5">{v.interest ?? "—"}</td>
                  <td className="px-4 py-2.5">{fmt(v.budget)}</td>
                  <td className="px-4 py-2.5">{SOURCE_LABEL[v.source]}</td>
                  <td className={`px-4 py-2.5 ${overdue ? "font-medium text-red-600" : "text-ink-faint"}`}>
                    {v.followUpDate ? new Date(v.followUpDate).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi" }) : "—"}
                    {overdue && " (overdue)"}
                  </td>
                  <td className="px-4 py-2.5">{v.branchName}</td>
                  <td className="px-4 py-2.5">
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[v.status]}`}>
                      {v.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="inline-flex items-center gap-1">
                      {v.status === "converted" ? (
                        <span className="text-xs text-ink-faint">converted ✓</span>
                      ) : (
                        <>
                          {editable && (
                            <EditVisitorForm
                              row={{
                                id: v.id,
                                fullName: v.fullName,
                                phone: v.phone,
                                cnic: v.cnic,
                                interest: v.interest,
                                budget: v.budget,
                                source: v.source,
                                status: v.status,
                                notes: v.notes,
                                followUpDate: v.followUpDate,
                                branchId: v.branchId,
                              }}
                              branches={branches.map((b) => ({ id: b.id, name: b.name }))}
                              fixedBranchId={fixedBranchId}
                            />
                          )}
                          {convertible && <ConvertVisitor id={v.id} />}
                        </>
                      )}
                    </span>
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
