"use client";

import { useActionState, useEffect, useState } from "react";
import { updateBranchAction, type ActionState } from "./actions";

type Branch = { id: number; name: string; city: string; address: string | null; phone: string | null };

export function EditBranchForm({ branch }: { branch: Branch }) {
  const [open, setOpen] = useState(false);
  const action = updateBranchAction.bind(null, branch.id);
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
        className="w-full max-w-lg card p-6 shadow-lg"
      >
        <h2 className="mb-4 text-sm font-semibold">Edit Branch — {branch.name}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field name="name" label="Branch Name *" defaultValue={branch.name} />
          <Field name="city" label="City *" defaultValue={branch.city} />
          <Field name="address" label="Address" defaultValue={branch.address ?? ""} />
          <Field name="phone" label="Phone" defaultValue={branch.phone ?? ""} />
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
