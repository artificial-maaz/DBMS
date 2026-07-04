import { redirect } from "next/navigation";
import { canManageBranches } from "@/modules/branches/service";
import { db } from "@/db";
import { requireStaff } from "@/lib/session";
import { AddBranchForm } from "./add-branch-form";
import { ToggleBranch } from "./toggle-branch";

export default async function BranchesPage() {
  const { profile } = await requireStaff();
  if (!canManageBranches(profile.role)) redirect("/dashboard");

  const rows = await db.query.branches.findMany({ orderBy: (b, { asc }) => asc(b.name) });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Showrooms & Branches</h1>
        <AddBranchForm />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium">{b.name}</td>
                <td className="px-4 py-2.5">{b.city}</td>
                <td className="px-4 py-2.5">{b.address ?? "—"}</td>
                <td className="px-4 py-2.5">{b.phone ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      b.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {b.isActive ? "active" : "inactive"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <ToggleBranch id={b.id} isActive={b.isActive} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
