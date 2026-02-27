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
      {/* #17 (Sir): the intro ran long enough to collide with the Add button on
          a laptop. `gap-4` plus a max-width on the text keeps them apart at any
          width, and the sentence itself is now one line instead of two. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="text-xl font-semibold">Installment Plans</h1>
          <p className="text-sm text-ink-faint">The company rate card. New Sale auto-fills from it, per-sale editable.</p>
        </div>
        {manageable && <AddPlanForm companies={companies} />}
      </div>

      {rows.length === 0 && (
        <p className="card px-4 py-10 text-center text-ink-faint">
          No rate cards yet.
        </p>
      )}

      {byCompany.map(({ company, plans }) => (
        <div key={company} className="space-y-3">
          {/* #17 (Sir): "YADEA", "RAMZA" were faint 12px grey — smaller and
              quieter than the table headers underneath them, so the grouping
              read as an afterthought. A company heading is the most important
              text on this page: it is now full ink, bold, and sized above the
              table, with a brand rule to anchor it. */}
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-bold uppercase tracking-wide text-ink">{company}</h2>
            <span className="h-px flex-1 bg-brand-200" />
            <span className="text-xs text-ink-faint">
              {plans.length} model{plans.length === 1 ? "" : "s"} · w.e.f{" "}
              {new Date(plans[0]?.effectiveDate).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi" })}
            </span>
          </div>
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
                        {!p.isActive && (
                          <span className="ml-2 rounded-full bg-raised px-2 py-0.5 text-xs text-ink-faint">retired</span>
                        )}
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
                    {/* The "Total Price" band used a hardcoded slate wash, which
                        in dark mode was a light stripe across a dark card — the
                        single loudest part of Sir's "chaos in dark mode". It is
                        now a brand tint, correct in both themes by construction. */}
                    <tr className="border-t border-line bg-brand-50/60">
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
        </div>
      ))}
    </div>
  );
}
