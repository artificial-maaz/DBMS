"use client";

import { useActionState, useEffect, useState } from "react";
import { updateCustomerAction, type ActionState } from "./actions";

type Branch = { id: number; name: string };
type CustomerRow = {
  id: number;
  fullName: string;
  phone: string;
  cnic: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  branchId: number;
};

export function EditCustomerForm({
  row,
  branches,
  fixedBranchId,
}: {
  row: CustomerRow;
  branches: Branch[];
  fixedBranchId: number | null;
}) {
  const [open, setOpen] = useState(false);
  const action = updateCustomerAction.bind(null, row.id);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-slate-100"
      >
        Edit
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <form
        action={formAction}
        className="w-full max-w-2xl card p-6 shadow-lg"
      >
        <h2 className="mb-4 text-sm font-semibold">Edit Customer — {row.fullName}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field name="fullName" label="Full Name *" defaultValue={row.fullName} />
          <Field name="phone" label="Phone *" defaultValue={row.phone} />
          <Field name="cnic" label="CNIC" defaultValue={row.cnic ?? ""} />
          <Field name="email" label="Email" defaultValue={row.email ?? ""} />
          <Field name="city" label="City" defaultValue={row.city ?? ""} />

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
                defaultValue={row.branchId}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2"
              >
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
              defaultValue={row.address ?? ""}
              className="w-full rounded-lg border border-line px-3 py-2"
            />
          </label>
        </div>

        {state && !state.ok && <p className="mt-3 text-sm text-red-600">{state.error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-ink-soft hover:bg-slate-100"
          >
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
        className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-slate-500"
      />
    </label>
  );
}
