import { redirect } from "next/navigation";
import { canManageRates, canViewRates, listRates } from "@/modules/labor-rates/service";
import { requireStaff } from "@/lib/session";
import { AddRateForm, RateRow } from "./rate-forms";

export default async function LaborRatesPage() {
  const { profile } = await requireStaff();
  if (!canViewRates(profile.role)) redirect("/dashboard");
  const manager = canManageRates(profile.role);
  const rates = await listRates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Standard Labor Rates</h1>
        {manager && <AddRateForm />}
      </div>

      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-raised text-left text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-3">Service / Repair</th>
              <th className="px-4 py-3 text-right">Labor Price</th>
              <th className="px-4 py-3">Equipment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rates.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-faint">
                  No services defined yet — add your standard price list.
                </td>
              </tr>
            )}
            {rates.map((r) => (
              <RateRow key={r.id} rate={r} canManage={manager} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-faint">
        These rates pre-fill the labor charge when completing a workshop job (still adjustable per job).
        Retire instead of delete — past jobs keep the price they were actually charged.
      </p>
    </div>
  );
}
