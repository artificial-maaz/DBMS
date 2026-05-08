"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addPlanAction, type ActionState } from "./actions";

export function AddPlanForm({ companies }: { companies: string[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addPlanAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state]);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
      >
        {open ? "Close" : "+ Add Model"}
      </button>

      {open && (
        <form ref={formRef} action={formAction} className="mt-4 card p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field name="company" label="Company *" placeholder="e.g. Yadea" list="companies" />
            <datalist id="companies">
              {companies.map((c) => <option key={c} value={c} />)}
            </datalist>
            <Field name="model" label="Model *" placeholder="e.g. M3" />
            <Field name="cashPrice" label="Cash Price (Rs.) *" placeholder="174,000" />
            <Field name="advance" label="Advance (Rs.) *" placeholder="87,000" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(["3", "6", "9", "12"] as const).map((m) => (
              <div key={m} className="rounded-lg bg-slate-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">{m} Months</p>
                <Field name={`monthly${m}`} label="Monthly (Rs.) *" placeholder="0" />
                <div className="mt-2">
                  <Field name={`total${m}`} label="Total Price (Rs.) *" placeholder="0" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Effective Date *</span>
              <input type="date" name="effectiveDate" required defaultValue={today} className="w-full rounded-lg border border-line px-3 py-2" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Notes</span>
              <input name="notes" placeholder="optional" className="w-full rounded-lg border border-line px-3 py-2" />
            </label>
          </div>

          {state && !state.ok && <p className="mt-3 text-sm text-red-600">{state.error}</p>}

          <div className="mt-4">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save Plan"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({ name, label, placeholder, list }: { name: string; label: string; placeholder?: string; list?: string }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        name={name}
        required={label.includes("*")}
        placeholder={placeholder}
        list={list}
        className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-slate-500"
      />
    </label>
  );
}
