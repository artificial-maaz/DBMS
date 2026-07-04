import { redirect } from "next/navigation";
import { canManageStaff, listStaff } from "@/modules/staff/service";
import { listActiveBranches } from "@/modules/inventory/queries";
import { requireStaff } from "@/lib/session";
import { AddStaffForm } from "./add-staff-form";
import { ToggleStaff } from "./toggle-staff";

const GRANTABLE: Record<string, string[]> = {
  creator: ["owner", "branch_manager", "salesperson", "mechanic", "gate_staff"],
  owner: ["branch_manager", "salesperson", "mechanic", "gate_staff"],
};

const ROLE_BADGE: Record<string, string> = {
  creator: "bg-slate-900 text-white",
  owner: "bg-indigo-100 text-indigo-700",
  branch_manager: "bg-sky-100 text-sky-700",
  salesperson: "bg-emerald-100 text-emerald-700",
  mechanic: "bg-amber-100 text-amber-700",
  gate_staff: "bg-slate-100 text-slate-600",
};

export default async function StaffPage() {
  const { profile } = await requireStaff();
  if (!canManageStaff(profile.role)) redirect("/dashboard");

  const [rows, branches] = await Promise.all([listStaff(), listActiveBranches()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Staff & Access</h1>
        <AddStaffForm
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
          grantableRoles={GRANTABLE[profile.role] ?? []}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Designation</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium">{m.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{m.email}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ROLE_BADGE[m.role]}`}>
                    {m.role.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-2.5">{m.branchName ?? "All branches"}</td>
                <td className="px-4 py-2.5">{m.designation ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-500">{new Date(m.joinedAt).toLocaleDateString("en-PK")}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      m.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {m.isActive ? "active" : "deactivated"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {m.role !== "creator" && <ToggleStaff id={m.id} isActive={m.isActive} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
