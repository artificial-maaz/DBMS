"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { runPayrollAction, type ActionState } from "./actions";

type Staff = { userId: string; name: string; role: string; basicSalary: string; monthlyAllowances: string };

function monthBounds(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return { start: iso(start), end: iso(end) };
}

export function PayrollForm({ staff }: { staff: Staff[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(runPayrollAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const { start, end } = monthBounds();

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state]);

  const emp = staff.find((s) => s.userId === selected);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
      >
        {open ? "Close" : "▶ Run Payroll"}
      </button>

      {open && (
        <form
          ref={formRef}
          action={formAction}
          className="mt-4 grid grid-cols-1 gap-4 card p-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label className="text-sm">
            <span className="mb-1 block font-medium">Employee *</span>
            <select
              name="userId"
              required
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2"
            >
              <option value="">Select employee…</option>
              {staff.map((s) => (
                <option key={s.userId} value={s.userId}>
                  {s.name} ({s.role.replace("_", " ")})
                </option>
              ))}
            </select>
            {emp && (
              <span className="mt-1 block text-xs text-ink-faint">
                Basic Rs. {Number(emp.basicSalary).toLocaleString("en-PK")} + allowances Rs.{" "}
                {Number(emp.monthlyAllowances).toLocaleString("en-PK")} · commissions auto-calculated
              </span>
            )}
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Period Start *</span>
            <input name="periodStart" type="date" required defaultValue={start} className="w-full rounded-lg border border-line px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Period End *</span>
            <input name="periodEnd" type="date" required defaultValue={end} className="w-full rounded-lg border border-line px-3 py-2" />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Bonus / Reward (Rs.)</span>
            <input name="bonus" placeholder="0" className="w-full rounded-lg border border-line px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Deductions (Rs.)</span>
            <input name="deductions" placeholder="0" className="w-full rounded-lg border border-line px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Notes</span>
            <input name="notes" placeholder="e.g. Eid bonus included" className="w-full rounded-lg border border-line px-3 py-2" />
          </label>

          {state && !state.ok && (
            <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{state.error}</p>
          )}

          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {pending ? "Releasing…" : "Release Payout"}
            </button>
            <p className="mt-2 text-xs text-ink-faint">
              Net = basic + allowances + period commissions + bonus − deductions. Posts to ledger as salary.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
