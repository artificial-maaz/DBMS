"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { advanceJobAction, createJobAction, type ActionState } from "./actions";

type Opt = { id: number | string; label: string };

export function CreateJobForm({
  customers,
  mechanics,
  branches,
  fixedBranchId,
}: {
  customers: Opt[];
  mechanics: Opt[];
  branches: Opt[];
  fixedBranchId: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createJobAction, null);
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
        {open ? "Close" : "+ New Job Card"}
      </button>

      {open && (
        <form
          ref={formRef}
          action={formAction}
          className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label className="text-sm">
            <span className="mb-1 block font-medium">Customer *</span>
            <select name="customerId" required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>

          <Field name="chassisNo" label="Chassis / VIN *" placeholder="type the bike's chassis no." />
          <Field name="odometerKm" label="Odometer (km)" placeholder="e.g. 1250" />

          <label className="text-sm">
            <span className="mb-1 block font-medium">Warranty Status *</span>
            <select name="warrantyStatus" required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="out_of_warranty">Out of warranty (chargeable)</option>
              <option value="free_coupon">Free maintenance coupon</option>
              <option value="in_warranty">In warranty</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Assign Mechanic</span>
            <select name="mechanicId" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">Unassigned</option>
              {mechanics.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Branch *</span>
            {fixedBranchId ? (
              <>
                <input type="hidden" name="branchId" value={fixedBranchId} />
                <input
                  disabled
                  value={branches.find((b) => Number(b.id) === fixedBranchId)?.label ?? "Your branch"}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                />
              </>
            ) : (
              <select name="branchId" required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                <option value="">Select branch…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
            )}
          </label>

          <label className="text-sm sm:col-span-2 lg:col-span-3">
            <span className="mb-1 block font-medium">Customer Complaints *</span>
            <textarea
              name="complaints"
              required
              rows={2}
              placeholder="e.g. rear brake squeaking, battery draining too fast…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          {state && !state.ok && (
            <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{state.error}</p>
          )}

          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {pending ? "Creating…" : "Create Job Card"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function JobActions({
  jobId,
  status,
  isManager,
  rates = [],
}: {
  jobId: number;
  status: string;
  isManager: boolean;
  /** #26: active standard labor rates — picking one fills the labor charge. */
  rates?: { serviceName: string; price: string }[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [labor, setLabor] = useState("");

  const run = (to: string, laborCharge?: string) =>
    start(async () => {
      const res = await advanceJobAction(jobId, to, laborCharge);
      setError(res && !res.ok ? (res.error ?? "Failed") : null);
    });

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      {status === "open" && (
        <Btn onClick={() => run("in_progress")} pending={pending} cls="bg-sky-50 text-sky-700 hover:bg-sky-100">
          Start
        </Btn>
      )}
      {status === "in_progress" && (
        <span className="inline-flex items-center gap-1.5">
          {rates.length > 0 && (
            <select
              defaultValue=""
              onChange={(e) => e.target.value && setLabor(e.target.value)}
              className="max-w-40 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs"
              title="Pick a standard service to fill the labor charge"
            >
              <option value="">standard service…</option>
              {rates.map((r) => (
                <option key={r.serviceName} value={r.price}>
                  {r.serviceName} — Rs. {Number(r.price).toLocaleString("en-PK")}
                </option>
              ))}
            </select>
          )}
          <input
            value={labor}
            onChange={(e) => setLabor(e.target.value)}
            placeholder="labor Rs."
            className="w-20 rounded-md border border-slate-300 px-2 py-1 text-xs"
          />
          <Btn onClick={() => run("completed", labor)} pending={pending} cls="bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
            Complete
          </Btn>
        </span>
      )}
      {status === "completed" && isManager && (
        <Btn onClick={() => run("delivered")} pending={pending} cls="bg-indigo-600 text-white hover:bg-indigo-500">
          Deliver & Collect
        </Btn>
      )}
      {(status === "open" || status === "in_progress") && isManager && (
        <Btn onClick={() => run("cancelled")} pending={pending} cls="bg-red-50 text-red-700 hover:bg-red-100">
          Cancel
        </Btn>
      )}
    </div>
  );
}

function Btn({
  onClick,
  pending,
  cls,
  children,
}: {
  onClick: () => void;
  pending: boolean;
  cls: string;
  children: React.ReactNode;
}) {
  return (
    <button disabled={pending} onClick={onClick} className={`rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${cls}`}>
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
