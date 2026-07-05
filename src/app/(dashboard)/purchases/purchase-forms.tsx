"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { payPurchaseAction, recordPurchaseAction, type ActionState } from "./actions";

type Opt = { id: number; label: string };

export function RecordPurchaseForm({ suppliers, branches }: { suppliers: Opt[]; branches: Opt[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(recordPurchaseAction, null);
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
        {open ? "Close" : "+ Record Purchase"}
      </button>

      {open && (
        <form
          ref={formRef}
          action={formAction}
          className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label className="text-sm">
            <span className="mb-1 block font-medium">Supplier *</span>
            <select name="supplierId" required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">Select supplier…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Receiving Branch *</span>
            <select name="branchId" required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">Select branch…</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Purchase Date *</span>
            <input
              name="purchaseDate"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <Field name="totalCost" label="Total Cost (Rs.) *" placeholder="e.g. 11,00,000" />
          <Field name="amountPaid" label="Paid Now (Rs.)" placeholder="0 — rest is payable" />

          <label className="text-sm sm:col-span-2 lg:col-span-3">
            <span className="mb-1 block font-medium">Description *</span>
            <input
              name="description"
              required
              placeholder="e.g. 10x Yadea G5 Pro units, 5x battery packs"
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
              {pending ? "Recording…" : "Record Purchase"}
            </button>
            <p className="mt-2 text-xs text-slate-400">
              Remember to register the actual vehicles in Inventory (or parts in Spare Parts) after recording the purchase.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}

export function PayPurchase({ poId, outstanding }: { poId: number; outstanding: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(outstanding));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (outstanding <= 0) return <span className="text-xs text-emerald-600">fully paid</span>;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
      >
        Pay
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-24 rounded-md border border-slate-300 px-2 py-1 text-xs"
      />
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await payPurchaseAction(poId, amount);
            setError(res && !res.ok ? (res.error ?? "Failed") : null);
            if (res?.ok) setOpen(false);
          })
        }
        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "…" : "✔"}
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
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
        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
      />
    </label>
  );
}
