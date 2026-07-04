"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addPartAction, adjustStockAction, type ActionState } from "./actions";

type Branch = { id: number; name: string };

export function AddPartForm({
  branches,
  showCost,
  fixedBranchId,
}: {
  branches: Branch[];
  showCost: boolean;
  fixedBranchId: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addPartAction, null);
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
        {open ? "Close" : "+ Add Part"}
      </button>

      {open && (
        <form
          ref={formRef}
          action={formAction}
          className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Field name="name" label="Part Name *" placeholder="e.g. 60V Battery Pack" />
          <Field name="partNo" label="Part No." placeholder="e.g. SP-E-102" />
          <Field name="sku" label="SKU / Barcode" placeholder="optional" />
          <Field name="initialQty" label="Initial Stock *" placeholder="e.g. 10" />
          {showCost && <Field name="costPrice" label="Cost Price (Rs.)" placeholder="e.g. 3,500" />}
          <Field name="retailPrice" label="Retail Price (Rs.)" placeholder="e.g. 5,000" />
          <Field name="lowStockAt" label="Low-stock alert at" placeholder="2" />

          <label className="text-sm">
            <span className="mb-1 block font-medium">Branch *</span>
            {fixedBranchId ? (
              <>
                <input type="hidden" name="branchId" value={fixedBranchId} />
                <input
                  disabled
                  value={branches.find((b) => b.id === fixedBranchId)?.name ?? "Your branch"}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                />
              </>
            ) : (
              <select name="branchId" required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                <option value="">Select branch…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
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
              {pending ? "Saving…" : "Save Part"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function AdjustStock({ partId, currentQty }: { partId: number; currentQty: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(adjustStockAction, null);

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
      >
        Adjust
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center justify-end gap-2">
      <input type="hidden" name="partId" value={partId} />
      <input
        name="delta"
        placeholder="+5 / -2"
        required
        className="w-20 rounded-md border border-slate-300 px-2 py-1 text-xs"
        title={`Current: ${currentQty}. Positive adds, negative deducts.`}
      />
      <select name="reason" className="rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs">
        <option value="restock">restock</option>
        <option value="adjustment">adjustment</option>
      </select>
      <input name="note" placeholder="note" className="w-24 rounded-md border border-slate-300 px-2 py-1 text-xs" />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "…" : "✔"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
      {state && !state.ok && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
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
