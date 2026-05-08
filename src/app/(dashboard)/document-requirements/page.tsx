import { redirect } from "next/navigation";
import { canManageRequirements, canViewRequirements } from "@/modules/document-requirements/permissions";
import { listRequirements } from "@/modules/document-requirements/queries";
import { requireStaff } from "@/lib/session";
import { AddRequirementForm } from "./add-requirement-form";
import { EditRequirementForm } from "./edit-requirement-form";
import { ToggleRequirement } from "./toggle-requirement";

export default async function DocumentRequirementsPage() {
  const { profile } = await requireStaff();
  if (!canViewRequirements(profile.role)) redirect("/dashboard");

  const rows = await listRequirements();
  const manageable = canManageRequirements(profile.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Document Checklist (Installment Prerequisites)</h1>
          <p className="text-sm text-ink-faint">
            Items checked at New Sale for installment plans. Not a hard requirement — a missing item can be waived
            with a compensation note instead of blocking the sale.
          </p>
        </div>
        {manageable && <AddRequirementForm />}
      </div>

      {rows.length === 0 && (
        <p className="card px-4 py-10 text-center text-ink-faint">
          No checklist items yet.
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead className="bg-raised text-left text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-3">Requirement</th>
                <th className="px-4 py-3">Status</th>
                {manageable && <th className="px-4 py-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-4 py-2.5 font-medium">{r.name}</td>
                  <td className="px-4 py-2.5">
                    {r.isActive ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">active</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-ink-faint">retired</span>
                    )}
                  </td>
                  {manageable && (
                    <td className="px-4 py-2.5 text-right">
                      <span className="inline-flex items-center gap-1">
                        <EditRequirementForm requirement={{ id: r.id, name: r.name }} />
                        <ToggleRequirement id={r.id} isActive={r.isActive} />
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
