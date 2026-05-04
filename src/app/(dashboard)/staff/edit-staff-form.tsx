"use client";

import { useActionState, useEffect, useState } from "react";
import { updateStaffAction, type ActionState } from "./actions";

type Branch = { id: number; name: string };
type StaffRow = {
  id: number;
  name: string;
  role: string;
  branchId: number | null;
  designation: string | null;
  cnic: string | null;
  basicSalary: string;
  monthlyAllowances: string;
  joinedAt: string | Date;
};

export function EditStaffForm({ row, branches }: { row: StaffRow; branches: Branch[] }) {
  const [open, setOpen] = useState(false);
  const action = updateStaffAction.bind(null, row.id);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);
  const needsBranch = row.role !== "owner" && row.role !== "creator";
  const joinedDefault = new Date(row.joinedAt).toISOString().slice(0, 10);

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
        <h2 className="mb-4 text-sm font-semibold">Edit Staff — {row.name}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field name="name" label="Full Name *" defaultValue={row.name} />
          <Field name="designation" label="Designation" defaultValue={row.designation ?? ""} />
          <Field name="cnic" label="CNIC" defaultValue={row.cnic ?? ""} />
          <Field name="basicSalary" label="Basic Monthly Salary (Rs.)" defaultValue={row.basicSalary} />
          <Field name="monthlyAllowances" label="Monthly Allowances (Rs.)" defaultValue={row.monthlyAllowances} />
          <label className="text-sm">
            <span className="mb-1 block font-medium">Joined Date *</span>
            <input
              type="date"
              name="joinedAt"
              required
              defaultValue={joinedDefault}
              className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-slate-500"
            />
          </label>

          {needsBranch && (
            <label className="text-sm">
              <span className="mb-1 block font-medium">Branch *</span>
              <select
                name="branchId"
                required
                defaultValue={row.branchId ?? ""}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2"
              >
                <option value="">Select branch…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
          )}
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
