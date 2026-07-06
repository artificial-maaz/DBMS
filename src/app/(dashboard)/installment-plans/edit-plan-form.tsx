"use client";

import { useActionState, useEffect, useState } from "react";
import { updatePlanAction, type ActionState } from "./actions";

type Plan = {
  id: number;
  company: string;
  model: string;
  cashPrice: string;
  advance: string;
  monthly3: string; total3: string;
  monthly6: string; total6: string;
  monthly9: string; total9: string;
  monthly12: string; total12: string;
  effectiveDate: string;
  notes: string | null;
};

export function EditPlanForm({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState(false);
  const action = updatePlanAction.bind(null, plan.id);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">
        Edit
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <form action={formAction} className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-sm font-semibold">Edit Plan — {plan.company} {plan.model}</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field name="company" label="Company *" defaultValue={plan.company} />
          <Field name="model" label="Model *" defaultValue={plan.model} />
          <Field name="cashPrice" label="Cash Price (Rs.) *" defaultValue={plan.cashPrice} />
          <Field name="advance" label="Advance (Rs.) *" defaultValue={plan.advance} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ["3", plan.monthly3, plan.total3],
            ["6", plan.monthly6, plan.total6],
            ["9", plan.monthly9, plan.total9],
            ["12", plan.monthly12, plan.total12],
          ] as const).map(([m, monthly, total]) => (
            <div key={m} className="rounded-lg bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{m} Months</p>
              <Field name={`monthly${m}`} label="Monthly (Rs.) *" defaultValue={monthly} />
              <div className="mt-2">
                <Field name={`total${m}`} label="Total Price (Rs.) *" defaultValue={total} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Effective Date *</span>
            <input type="date" name="effectiveDate" required defaultValue={plan.effectiveDate} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <Field name="notes" label="Notes" defaultValue={plan.notes ?? ""} />
        </div>

        {state && !state.ok && <p className="mt-3 text-sm text-red-600">{state.error}</p>}

        <div className="mt-5 flex gap-3">
          <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
            {pending ? "Saving…" : "Save Changes"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        name={name}
        required={label.includes("*")}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
      />
    </label>
  );
}
