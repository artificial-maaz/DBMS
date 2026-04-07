import { Fragment } from "react";
import { redirect } from "next/navigation";
import { canManagePlans, canViewPlans } from "@/modules/installment-plans/permissions";
import { listPlans } from "@/modules/installment-plans/queries";
import { requireStaff } from "@/lib/session";
import { AddPlanForm } from "./add-plan-form";
import { EditPlanForm } from "./edit-plan-form";
import { TogglePlan } from "./toggle-plan";

export default async function InstallmentPlansPage() {
  const { profile } = await requireStaff();
  if (!canViewPlans(profile.role)) redirect("/dashboard");

  const rows = await listPlans();
  const manageable = canManagePlans(profile.role);
  const fmt = (v: string) => Number(v).toLocaleString("en-PK");

  const companies = [...new Set(rows.map((r) => r.company))];
  const byCompany = companies.map((c) => ({ company: c, plans: rows.filter((r) => r.company === c) }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Installment Plans</h1>
          <p className="text-sm text-ink-faint">
            The company-approved rate card. New Sale auto-fills from here by matching the vehicle&apos;s make/model —
            still fully editable per sale.
          </p>
        </div>
        {manageable && <AddPlanForm companies={companies} />}
      </div>

      {rows.length === 0 && (
        <p className="card px-4 py-10 text-center text-ink-faint">
          No rate cards yet.
        </p>
      )}

      {byCompany.map(({ company, plans }) => (
        <div key={company} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">{company}</h2>
          <div className="overflow-x-auto card">
            <table className="w-full text-sm">
              <thead className="bg-raised text-left text-xs uppercase tracking-wide text-ink-faint">
                <tr>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3">Cash Price</th>
                  <th className="px-4 py-3">Advance</th>
                  <th className="px-4 py-3">Instalments</th>
                  <th className="px-4 py-3 text-right">3 Months</th>
                  <th className="px-4 py-3 text-right">6 Months</th>
                  <th className="px-4 py-3 text-right">9 Months</th>
                  <th className="px-4 py-3 text-right">12 Months</th>
                  {manageable && <th className="px-4 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <Fragment key={p.id}>
                    <tr className="border-t border-line">
                      <td rowSpan={2} className="px-4 py-2.5 font-medium align-top">
                        {p.model}
                        {!p.isActive && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-ink-faint">retired</span>}
                      </td>
                      <td rowSpan={2} className="px-4 py-2.5 align-top">Rs. {fmt(p.cashPrice)}</td>
                      <td rowSpan={2} className="px-4 py-2.5 align-top">Rs. {fmt(p.advance)}</td>
                      <td className="px-4 py-2 text-xs font-medium text-ink-faint">Monthly</td>
                      <td className="px-4 py-2 text-right">{fmt(p.monthly3)}</td>
                      <td className="px-4 py-2 text-right">{fmt(p.monthly6)}</td>
                      <td className="px-4 py-2 text-right">{fmt(p.monthly9)}</td>
                      <td className="px-4 py-2 text-right">{fmt(p.monthly12)}</td>
                      {manageable && (
                        <td rowSpan={2} className="px-4 py-2.5 text-right align-top">
                          <span className="inline-flex items-center gap-1">
                            <EditPlanForm plan={{ ...p, notes: p.notes }} />
                            <TogglePlan id={p.id} isActive={p.isActive} />
                          </span>
                        </td>
                      )}
                    </tr>
                    <tr className="border-t border-slate-50 bg-slate-50/40">
                      <td className="px-4 py-2 text-xs font-medium text-ink-faint">Total Price</td>
                      <td className="px-4 py-2 text-right font-medium">{fmt(p.total3)}</td>
                      <td className="px-4 py-2 text-right font-medium">{fmt(p.total6)}</td>
                      <td className="px-4 py-2 text-right font-medium">{fmt(p.total9)}</td>
                      <td className="px-4 py-2 text-right font-medium">{fmt(p.total12)}</td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-ink-faint">
            w.e.f {new Date(plans[0]?.effectiveDate).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi" })}
          </p>
        </div>
      ))}
    </div>
  );
}
