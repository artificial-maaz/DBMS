import { redirect } from "next/navigation";
import { canManageStaff, canViewStaff, listStaff } from "@/modules/staff/service";
import { listActiveBranches } from "@/modules/inventory/queries";
import { requireStaff } from "@/lib/session";
import { AddStaffForm } from "./add-staff-form";
import { EditStaffForm } from "./edit-staff-form";
import { ToggleStaff } from "./toggle-staff";

/** #18: only the Creator can grant roles; Owners view the directory read-only. */
const GRANTABLE: Record<string, string[]> = {
  creator: ["owner", "silent_partner", "branch_manager", "salesperson", "mechanic", "gate_staff"],
};

const ROLE_BADGE: Record<string, string> = {
  creator: "bg-slate-900 text-white",
  owner: "bg-brand-100 text-brand-700",
  silent_partner: "bg-purple-100 text-purple-700",
  branch_manager: "bg-sky-100 text-sky-700",
  salesperson: "bg-emerald-100 text-emerald-700",
  assistant: "bg-teal-100 text-teal-700",
  mechanic: "bg-amber-100 text-amber-700",
  gate_staff: "bg-slate-100 text-ink-soft",
};

export default async function StaffPage() {
  const { profile } = await requireStaff();
  if (!canViewStaff(profile.role)) redirect("/dashboard");
  const manager = canManageStaff(profile.role);

  const [rows, branches] = await Promise.all([listStaff(), listActiveBranches()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Staff & Access</h1>
        {manager && (
          <AddStaffForm
            branches={branches.map((b) => ({ id: b.id, name: b.name }))}
            grantableRoles={GRANTABLE[profile.role] ?? []}
          />
        )}
      </div>

      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-raised text-left text-xs uppercase tracking-wide text-ink-faint">
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
              <tr key={m.id} className="border-t border-line row-hover">
                <td className="px-4 py-2.5 font-medium">{m.name}</td>
                <td className="px-4 py-2.5 text-ink-soft">{m.email}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_BADGE[m.role]}`}
                  >
                    {m.role.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-2.5">{m.branchName ?? "All branches"}</td>
                <td className="px-4 py-2.5">{m.designation ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink-faint">{new Date(m.joinedAt).toLocaleDateString("en-PK")}</td>
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
                  {manager && (
                    <span className="inline-flex items-center gap-1">
                      <EditStaffForm
                        row={{
                          id: m.id,
                          name: m.name,
                          role: m.role,
                          branchId: m.branchId,
                          designation: m.designation,
                          cnic: m.cnic,
                          basicSalary: m.basicSalary,
                          monthlyAllowances: m.monthlyAllowances,
                          joinedAt: m.joinedAt,
                        }}
                        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
                      />
                      {m.role !== "creator" && <ToggleStaff id={m.id} isActive={m.isActive} />}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
