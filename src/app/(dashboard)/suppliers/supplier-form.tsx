"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addSupplierAction, type ActionState } from "./actions";

export function AddSupplierForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addSupplierAction, null);
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
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
      >
        {open ? "Close" : "+ Register Supplier"}
      </button>

      {open && (
        <form
          ref={formRef}
          action={formAction}
          className="mt-4 grid grid-cols-1 gap-4 card p-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Field name="name" label="Supplier / Manufacturer Name *" placeholder="e.g. Yadea Pakistan" />
          <Field name="contactPerson" label="Contact Person" placeholder="e.g. Mr. Adnan Shah" />
          <Field name="phone" label="Phone" placeholder="0312-XXXXXXX" />
          <Field name="email" label="Email" placeholder="info@supplier.pk" />
          <Field name="city" label="City" placeholder="e.g. Karachi" />
          <Field name="ntn" label="NTN / Tax Reg." placeholder="NTN-XXXXXXX-X" />
          <label className="text-sm sm:col-span-2 lg:col-span-3">
            <span className="mb-1 block font-medium">Notes / Specialization</span>
            <input name="notes" placeholder="e.g. specializes in 2000W motors" className="w-full rounded-lg border border-line px-3 py-2" />
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
              {pending ? "Saving…" : "Register Supplier"}
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
        className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-slate-500"
      />
    </label>
  );
}
