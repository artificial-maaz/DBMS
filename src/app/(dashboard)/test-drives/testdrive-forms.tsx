"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { bookTestDriveAction, setStatusAction, type ActionState } from "./actions";

type Opt = { id: number; label: string };

export function BookTestDriveForm({
  customers,
  vehicles,
  branches,
  fixedBranchId,
  defaultBranchId,
}: {
  customers: Opt[];
  vehicles: Opt[];
  branches: Opt[];
  fixedBranchId: number | null;
  defaultBranchId?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState("");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(bookTestDriveAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  const isFriday = when ? new Date(when).getDay() === 5 : false;

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setWhen("");
      setOpen(false);
    }
  }, [state]);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        {open ? "Close" : "+ Book Test Drive"}
      </button>

      {open && (
        <form
          ref={formRef}
          action={formAction}
          className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Field name="personName" label="Rider Name *" placeholder="full name" />
          <Field name="phone" label="Phone *" placeholder="03001234567" />

          <label className="text-sm">
            <span className="mb-1 block font-medium">Link Existing Customer</span>
            <select name="customerId" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">Walk-in / not registered</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Vehicle (in stock)</span>
            <select name="vehicleId" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">Not specified</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          </label>

          <Field name="vehicleText" label="…or Model of Interest" placeholder="e.g. Yadea T5L" />

          <label className="text-sm">
            <span className="mb-1 block font-medium">Date & Time *</span>
            <input
              name="scheduledAt"
              type="datetime-local"
              required
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 ${isFriday ? "border-red-400 bg-red-50" : "border-slate-300"}`}
            />
            {isFriday && (
              <span className="mt-1 block text-xs font-medium text-red-600">
                Branches are closed on Fridays — pick another day.
              </span>
            )}
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Branch *</span>
            {fixedBranchId ? (
              <>
                <input type="hidden" name="branchId" value={fixedBranchId} />
                <input
                  disabled
                  value={branches.find((b) => b.id === fixedBranchId)?.label ?? "Your branch"}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                />
              </>
            ) : (
              <select name="branchId" required defaultValue={defaultBranchId ?? ""} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                <option value="">Select branch…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
            )}
          </label>

          <label className="text-sm sm:col-span-2 lg:col-span-3">
            <span className="mb-1 block font-medium">Notes</span>
            <input name="notes" placeholder="license shown, deposit, remarks…" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>

          {state && !state.ok && (
            <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{state.error}</p>
          )}

          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={pending || isFriday}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {pending ? "Booking…" : "Book Test Drive"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function RideActions({ id, status }: { id: number; status: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status !== "scheduled") return null;

  const run = (to: string) =>
    start(async () => {
      const res = await setStatusAction(id, to);
      setError(res && !res.ok ? (res.error ?? "Failed") : null);
    });

  return (
    <span className="inline-flex items-center gap-1.5">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <Btn onClick={() => run("completed")} pending={pending} cls="bg-emerald-50 text-emerald-700 hover:bg-emerald-100">Done</Btn>
      <Btn onClick={() => run("no_show")} pending={pending} cls="bg-amber-50 text-amber-700 hover:bg-amber-100">No-show</Btn>
      <Btn onClick={() => run("cancelled")} pending={pending} cls="bg-red-50 text-red-700 hover:bg-red-100">Cancel</Btn>
    </span>
  );
}

function Btn({ onClick, pending, cls, children }: { onClick: () => void; pending: boolean; cls: string; children: React.ReactNode }) {
  return (
    <button disabled={pending} onClick={onClick} className={`rounded-md px-2 py-1 text-xs font-medium disabled:opacity-50 ${cls}`}>
      {pending ? "…" : children}
    </button>
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
