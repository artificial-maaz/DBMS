"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { cancelPassAction, issuePassAction, receivePassAction, type ActionState } from "./actions";

type Opt = { id: number; label: string };
type VehicleOpt = Opt & { branchId: number };

export function IssuePassForm({ vehicles, branches }: { vehicles: VehicleOpt[]; branches: Opt[] }) {
  const [open, setOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState("");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(issuePassAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  // #2 (2026-07-31): the pass must show BOTH ends of the move, not just the destination.
  const sourceBranchId = vehicles.find((v) => String(v.id) === vehicleId)?.branchId;
  const sourceName = branches.find((b) => b.id === sourceBranchId)?.label;

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
        {open ? "Close" : "+ Issue Gate Pass"}
      </button>

      {open && (
        <form
          ref={formRef}
          action={formAction}
          className="mt-4 grid grid-cols-1 gap-4 card p-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label className="text-sm">
            <span className="mb-1 block font-medium">Vehicle (in stock) *</span>
            <select
              name="vehicleId"
              required
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2"
            >
              <option value="">Select vehicle…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Source Branch</span>
            <input
              disabled
              value={sourceName ?? "— select a vehicle first —"}
              className="w-full rounded-lg border border-line bg-raised px-3 py-2"
            />
            <span className="mt-1 block text-xs text-ink-faint">Where the vehicle currently sits — it ships FROM here.</span>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Destination Branch *</span>
            <select name="destBranchId" required className="w-full rounded-lg border border-line bg-surface px-3 py-2">
              <option value="">Select destination…</option>
              {branches
                .filter((b) => b.id !== sourceBranchId)
                .map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
            </select>
          </label>

          <Field name="driverName" label="Driver Name *" placeholder="full name" />
          <Field name="driverPhone" label="Driver Phone" placeholder="03001234567" />
          <Field name="transportPlate" label="Transport Vehicle Plate" placeholder="e.g. LES-2026" />
          <Field name="notes" label="Transit Notes" placeholder="special instructions…" />

          {state && !state.ok && (
            <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{state.error}</p>
          )}

          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {pending ? "Issuing…" : "Issue Gate Pass"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function PassActions({ passId, canReceive, canCancel }: { passId: number; canReceive: boolean; canCancel: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: (id: number) => Promise<ActionState>) =>
    start(async () => {
      const res = await fn(passId);
      setError(res && !res.ok ? (res.error ?? "Failed") : null);
    });

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      {canReceive && (
        <button
          disabled={pending}
          onClick={() => run(receivePassAction)}
          className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
        >
          {pending ? "…" : "Receive"}
        </button>
      )}
      {canCancel && (
        <button
          disabled={pending}
          onClick={() => run(cancelPassAction)}
          className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          {pending ? "…" : "Cancel"}
        </button>
      )}
    </span>
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
        className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-500"
      />
    </label>
  );
}
