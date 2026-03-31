import { redirect } from "next/navigation";
import { canManageHandoverItems, canViewHandoverItems } from "@/modules/handover-requirements/permissions";
import { listHandoverItems } from "@/modules/handover-requirements/queries";
import { requireStaff } from "@/lib/session";
import { AddHandoverItemForm } from "./add-handover-item-form";
import { EditHandoverItemForm } from "./edit-handover-item-form";
import { ToggleHandoverItem } from "./toggle-handover-item";

export default async function HandoverRequirementsPage() {
  const { profile } = await requireStaff();
  if (!canViewHandoverItems(profile.role)) redirect("/dashboard");

  const rows = await listHandoverItems();
  const manageable = canManageHandoverItems(profile.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Handover Checklist</h1>
          <p className="text-sm text-ink-faint">
            Worked through at New Sale on <strong>every</strong> sale, cash or installment. Not a hard requirement —
            an unticked item records a note instead of blocking the sale.
          </p>
        </div>
        {manageable && <AddHandoverItemForm />}
      </div>

      {rows.length === 0 && (
        <p className="card px-4 py-10 text-center text-ink-faint">
          No handover items yet. Run <code>npm run db:seed:handover</code> or add them here.
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead className="bg-raised text-left text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Status</th>
                {manageable && <th className="px-4 py-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line row-hover">
                  <td className="px-4 py-2.5 font-medium">{r.name}</td>
                  <td className="px-4 py-2.5">
                    {r.isActive ? (
                      <span className="rounded-full bg-ok-soft px-2 py-0.5 text-xs text-ok">active</span>
                    ) : (
                      <span className="rounded-full bg-raised px-2 py-0.5 text-xs text-ink-faint">retired</span>
                    )}
                  </td>
                  {manageable && (
                    <td className="px-4 py-2.5 text-right">
                      <span className="inline-flex items-center gap-1">
                        <EditHandoverItemForm item={{ id: r.id, name: r.name }} />
                        <ToggleHandoverItem id={r.id} isActive={r.isActive} />
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
