"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { addAssetAction, toggleAssetAction, type ActionState } from "./actions";

type Branch = { id: number; name: string };

export function AddAssetForm({ branches }: { branches: Branch[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addAssetAction, null);
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
        {open ? "Close" : "+ Register Asset"}
      </button>
      {open && (
        <form ref={formRef} action={formAction} className="mt-4 grid grid-cols-1 gap-4 card p-6 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Branch *</span>
            <select name="branchId" required className="w-full rounded-lg border border-line bg-surface px-3 py-2">
              <option value="">Select branch…</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Asset Name *</span>
            <input name="name" required placeholder="e.g. CCTV camera set" className="w-full rounded-lg border border-line px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Category *</span>
            <select name="category" className="w-full rounded-lg border border-line bg-surface px-3 py-2">
              {["furniture", "device", "appliance", "crockery", "other"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Quantity *</span>
            <input name="qty" type="number" min={1} defaultValue={1} className="w-full rounded-lg border border-line px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Unit Value (Rs.) *</span>
            <input name="unitValue" required inputMode="decimal" placeholder="e.g. 25,000" className="w-full rounded-lg border border-line px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Purchased On</span>
            <input name="purchasedOn" type="date" className="w-full rounded-lg border border-line px-3 py-2" />
          </label>
          {state && !state.ok && <p className="text-sm text-red-600 sm:col-span-3">{state.error}</p>}
          <div className="sm:col-span-3">
            <button type="submit" disabled={pending} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50">
              {pending ? "Saving…" : "Save Asset"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function ToggleAsset({ id, isActive }: { id: number; isActive: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => void (await toggleAssetAction(id, !isActive)))}
      className={`rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
        isActive ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      }`}
    >
      {pending ? "…" : isActive ? "Retire" : "Reactivate"}
    </button>
  );
}
