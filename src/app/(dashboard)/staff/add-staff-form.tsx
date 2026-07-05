"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addStaffAction, type ActionState } from "./actions";

type Branch = { id: number; name: string };

export function AddStaffForm({ branches, grantableRoles }: { branches: Branch[]; grantableRoles: string[] }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(grantableRoles[grantableRoles.length - 1] ?? "salesperson");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addStaffAction, null);
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
        {open ? "Close" : "+ Onboard Staff"}
      </button>

      {open && (
        <form
          ref={formRef}
          action={formAction}
          className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Field name="name" label="Full Name *" placeholder="e.g. Ali Raza" />
          <Field name="email" label="Login Email *" placeholder="ali@example.com" />
          <Field name="password" label="Temp Password * (8+ chars)" placeholder="they change it after login" />
          <Field name="designation" label="Designation" placeholder="e.g. Senior Sales Officer" />
          <Field name="cnic" label="CNIC" placeholder="42201-1234567-1" />
          <Field name="basicSalary" label="Basic Monthly Salary (Rs.)" placeholder="e.g. 40,000" />
          <Field name="monthlyAllowances" label="Monthly Allowances (Rs.)" placeholder="e.g. 3,000" />

          <label className="text-sm">
            <span className="mb-1 block font-medium">Role *</span>
            <select
              name="role"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 capitalize"
            >
              {grantableRoles.map((r) => (
                <option key={r} value={r}>{r.replace("_", " ")}</option>
              ))}
            </select>
          </label>

          {role !== "owner" && (
            <label className="text-sm">
              <span className="mb-1 block font-medium">Branch *</span>
              <select name="branchId" required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                <option value="">Select branch…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
          )}

          {state && !state.ok && (
            <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{state.error}</p>
          )}

          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {pending ? "Creating account…" : "Onboard Staff Member"}
            </button>
            <p className="mt-2 text-xs text-slate-400">
              Share the email + temp password with them privately; they should change it in Settings after first login.
            </p>
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
