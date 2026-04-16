"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addCustomerAction, type ActionState } from "./actions";

type Branch = { id: number; name: string };

export function AddCustomerForm({
  branches,
  fixedBranchId,
  defaultBranchId,
}: {
  branches: Branch[];
  fixedBranchId: number | null;
  defaultBranchId?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addCustomerAction, null);
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
        {open ? "Close" : "+ Add Customer"}
      </button>

      {open && (
        <form
          ref={formRef}
          action={formAction}
          className="mt-4 grid grid-cols-1 gap-4 card p-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Field name="fullName" label="Full Name *" placeholder="e.g. Muhammad Ahmad" />
          <Field name="phone" label="Phone *" placeholder="03001234567" />
          <Field name="cnic" label="CNIC" placeholder="42201-1234567-1" />
          <Field name="email" label="Email" placeholder="optional" />
          <Field name="city" label="City" placeholder="e.g. Lahore" />

          <label className="text-sm">
            <span className="mb-1 block font-medium">Branch *</span>
            {fixedBranchId ? (
              <>
                <input type="hidden" name="branchId" value={fixedBranchId} />
                <input
                  disabled
                  value={branches.find((b) => b.id === fixedBranchId)?.name ?? "Your branch"}
                  className="w-full rounded-lg border border-line bg-slate-50 px-3 py-2"
                />
              </>
            ) : (
              <select
                name="branchId"
                required
                defaultValue={defaultBranchId ?? ""}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2"
              >
                <option value="">Select branch…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </label>

          <label className="text-sm sm:col-span-2 lg:col-span-3">
            <span className="mb-1 block font-medium">Address</span>
            <textarea
              name="address"
              rows={2}
              className="w-full rounded-lg border border-line px-3 py-2"
              placeholder="House, block, area…"
            />
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
              {pending ? "Saving…" : "Save Customer"}
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
