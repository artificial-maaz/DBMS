"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addDeliveryAction, type ActionState } from "./actions";

type Opt = { id: number; name: string };
type Line = {
  make: string;
  model: string;
  variant: string;
  color: string;
  chassisNo: string;
  engineNo: string;
  purchasePrice: string;
  salePrice: string;
};

const blank = (): Line => ({
  make: "",
  model: "",
  variant: "",
  color: "",
  chassisNo: "",
  engineNo: "",
  purchasePrice: "",
  salePrice: "",
});

export function AddDeliveryForm({
  branches,
  suppliers,
  defaultBranchId,
  showCost,
}: {
  branches: Opt[];
  suppliers: Opt[];
  defaultBranchId: number | null;
  showCost: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Dynamic rows can't ride plain FormData, so they're serialized into one
  // hidden JSON field (same pattern as guarantors on the sale form).
  const [lines, setLines] = useState<Line[]>([blank()]);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addDeliveryAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setLines([blank()]);
      setOpen(false);
    }
  }, [state]);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
      >
        {open ? "Close" : "+ Record Delivery"}
      </button>

      {open && (
        <form ref={formRef} action={formAction} className="mt-4 space-y-6 card p-6">
          <div>
            <h3 className="mb-3 text-sm font-semibold">Consignment Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm">
                <span className="mb-1 block font-medium">Receiving Branch *</span>
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
              </label>

              <label className="text-sm">
                <span className="mb-1 block font-medium">Supplier / Company</span>
                <select name="supplierId" className="w-full rounded-lg border border-line bg-surface px-3 py-2">
                  <option value="">Not in the list…</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="mb-1 block font-medium">…or type Company Name</span>
                <input name="companyName" placeholder="e.g. Yadea Pakistan" className="w-full rounded-lg border border-line px-3 py-2" />
              </label>

              <label className="text-sm">
                <span className="mb-1 block font-medium">Delivery Date *</span>
                <input
                  type="date"
                  name="deliveredOn"
                  required
                  defaultValue={today}
                  max={today}
                  className="w-full rounded-lg border border-line px-3 py-2"
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block font-medium">Challan / Invoice No.</span>
                <input name="challanNo" placeholder="supplier's own doc no." className="w-full rounded-lg border border-line px-3 py-2" />
              </label>

              <label className="text-sm">
                <span className="mb-1 block font-medium">Batch Reference</span>
                <input name="batchRef" placeholder="e.g. B-2026-07" className="w-full rounded-lg border border-line px-3 py-2" />
              </label>

              <label className="text-sm">
                <span className="mb-1 block font-medium">Driver Name</span>
                <input name="driverName" className="w-full rounded-lg border border-line px-3 py-2" />
              </label>

              <label className="text-sm">
                <span className="mb-1 block font-medium">Transport Plate</span>
                <input name="transportPlate" placeholder="e.g. LES-2026" className="w-full rounded-lg border border-line px-3 py-2" />
              </label>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Units Received <span className="font-normal text-ink-faint">({lines.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => setLines((r) => [...r, blank()])}
                className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium hover:bg-slate-200"
              >
                + Add another unit
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((l, i) => (
                <div key={i} className="rounded-lg border border-line bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-ink-faint">Unit {i + 1}</span>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setLines((r) => r.filter((_, idx) => idx !== i))}
                        className="text-xs text-red-600 hover:underline"
                      >
                        remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Cell label="Make *" value={l.make} onChange={(v) => setLine(i, { make: v })} placeholder="Yadea" />
                    <Cell label="Model *" value={l.model} onChange={(v) => setLine(i, { model: v })} placeholder="G5 Pro" />
                    <Cell label="Variant" value={l.variant} onChange={(v) => setLine(i, { variant: v })} placeholder="72V" />
                    <Cell label="Color" value={l.color} onChange={(v) => setLine(i, { color: v })} placeholder="Black" />
                    <Cell label="Chassis No. *" value={l.chassisNo} onChange={(v) => setLine(i, { chassisNo: v })} mono />
                    <Cell label="Engine No. *" value={l.engineNo} onChange={(v) => setLine(i, { engineNo: v })} mono />
                    {showCost && (
                      <Cell label="Unit Cost" value={l.purchasePrice} onChange={(v) => setLine(i, { purchasePrice: v })} placeholder="e.g. 1,85,000" />
                    )}
                    <Cell label="Sale Price" value={l.salePrice} onChange={(v) => setLine(i, { salePrice: v })} placeholder="e.g. 2,15,000" />
                  </div>
                </div>
              ))}
            </div>
            <input type="hidden" name="vehicles" value={JSON.stringify(lines)} />
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Notes</span>
            <textarea name="notes" rows={2} placeholder="damage on arrival, short shipment, anything worth recording…" className="w-full rounded-lg border border-line px-3 py-2" />
          </label>

          {state && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.ok && state.queued && (
            <p className="text-sm text-amber-700">Sent for approval — stock registers once an owner approves.</p>
          )}

          <div>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {pending ? "Saving…" : `Record Delivery (${lines.length} unit${lines.length === 1 ? "" : "s"})`}
            </button>
            <p className="mt-2 text-xs text-ink-faint">
              All units register into inventory together — if one chassis is a duplicate, nothing is saved.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}

function Cell({
  label,
  value,
  onChange,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <label className="text-xs">
      <span className="mb-1 block font-medium text-ink-soft">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={label.includes("*")}
        className={`w-full rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none focus:border-slate-500 ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}
