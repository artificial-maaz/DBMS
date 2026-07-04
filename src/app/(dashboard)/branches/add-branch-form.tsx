"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addBranchAction, type ActionState } from "./actions";

export function AddBranchForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addBranchAction, null);
  const formRef = useRef<HTMLFormElement>(null);

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
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        {open ? "Close" : "+ Register Branch"}
      </button>

      {open && (
        <form
          ref={formRef}
          action={formAction}
          className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2"
        >
          <Field name="name" label="Branch Name *" placeholder="e.g. DHA Showroom" />
          <Field name="city" label="City *" placeholder="e.g. Lahore" />
          <Field name="address" label="Address" placeholder="Plot, block, area…" />
          <Field name="phone" label="Phone" placeholder="042-1234567" />

          {state && !state.ok && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save Branch"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        name={name}
        required={label.includes("*")}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
      />
    </label>
  );
}
