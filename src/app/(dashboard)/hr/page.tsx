import { redirect } from "next/navigation";
import { canRunPayroll, listPayableStaff, listPayroll } from "@/modules/hr/service";
import { requireStaff } from "@/lib/session";
import { PayrollForm } from "./payroll-form";

export default async function HrPage() {
  const { profile } = await requireStaff();
  if (!canRunPayroll(profile.role)) redirect("/dashboard");

  const [staff, records] = await Promise.all([listPayableStaff(), listPayroll()]);
  const fmt = (v: string) => `Rs. ${Number(v).toLocaleString("en-PK")}`;
  const d = (v: string | Date) => new Date(v).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">HR & Payroll</h1>
        <PayrollForm staff={staff} />
      </div>

      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-raised text-left text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-3">Pay #</th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3 text-right">Basic</th>
              <th className="px-4 py-3 text-right">Allowances</th>
              <th className="px-4 py-3 text-right">Commissions</th>
              <th className="px-4 py-3 text-right">Bonus</th>
              <th className="px-4 py-3 text-right">Deductions</th>
              <th className="px-4 py-3 text-right">Net Payout</th>
              <th className="px-4 py-3">Released</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-ink-faint">
                  No payroll released yet. Set salaries on staff profiles, then Run Payroll.
                </td>
              </tr>
            )}
            {records.map((r) => (
              <tr key={r.id} className="border-t border-line row-hover">
                <td className="px-4 py-2.5 font-mono text-xs font-medium text-brand-700">{r.payNo}</td>
                <td className="px-4 py-2.5 font-medium">{r.employeeName}</td>
                <td className="px-4 py-2.5 text-xs text-ink-faint">
                  {d(r.periodStart)} → {d(r.periodEnd)}
                </td>
                <td className="px-4 py-2.5 text-right">{fmt(r.basicSalary)}</td>
                <td className="px-4 py-2.5 text-right text-emerald-600">+{fmt(r.allowances)}</td>
                <td className="px-4 py-2.5 text-right text-emerald-600">+{fmt(r.commissions)}</td>
                <td className="px-4 py-2.5 text-right text-emerald-600">+{fmt(r.bonus)}</td>
                <td className="px-4 py-2.5 text-right text-red-600">−{fmt(r.deductions)}</td>
                <td className="px-4 py-2.5 text-right font-semibold">{fmt(r.netPayout)}</td>
                <td className="px-4 py-2.5 text-ink-faint">{d(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink-faint">
        Salary and allowance amounts live on each staff profile (Staff page). Commissions pull automatically
        from finalized sales in the pay period. Every release posts to the Cash Ledger.
      </p>
    </div>
  );
}
