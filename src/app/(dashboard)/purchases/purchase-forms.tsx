"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { payPurchaseAction, receiveItemAction, recordPurchaseAction, type ActionState } from "./actions";

type Opt = { id: number; label: string };
type Line = { model: string; color: string; qtyOrdered: string; unitCost: string };

const EMPTY_LINE: Line = { model: "", color: "", qtyOrdered: "1", unitCost: "" };

export function RecordPurchaseForm({ suppliers, branches }: { suppliers: Opt[]; branches: Opt[] }) {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(recordPurchaseAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  const n = (v: string) => {
    const x = Number(String(v).replace(/[,\s]/g, ""));
    return isNaN(x) ? 0 : x;
  };
  const total = useMemo(() => lines.reduce((acc, l) => acc + n(l.qtyOrdered) * n(l.unitCost), 0), [lines]);
  const itemsJson = useMemo(
    () =>
      JSON.stringify(
        lines
          .filter((l) => l.model.trim())
          .map((l) => ({ model: l.model, color: l.color, qtyOrdered: n(l.qtyOrdered), unitCost: l.unitCost })),
      ),
    [lines],
  );

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setLines([{ ...EMPTY_LINE }]);
      setOpen(false);
    }
  }, [state]);

  const setLine = (idx: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
      >
        {open ? "Close" : "+ Record Purchase"}
      </button>

      {open && (
        <form ref={formRef} action={formAction} className="mt-4 space-y-4 card p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Supplier *</span>
              <select name="supplierId" required className="w-full rounded-lg border border-line bg-surface px-3 py-2">
                <option value="">Select supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Receiving Branch *</span>
              <select name="branchId" required className="w-full rounded-lg border border-line bg-surface px-3 py-2">
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
                className="w-full rounded-lg border border-line px-3 py-2"
              />
            </label>
          </div>

          {/* #15: line items — model × color × qty × unit cost */}
          <div>
            <span className="mb-2 block text-sm font-medium">Order Lines *</span>
            <div className="space-y-2">
              {lines.map((l, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2">
                  <input
                    placeholder="Model (e.g. Yadea G5 Pro) *"
                    value={l.model}
                    onChange={(e) => setLine(idx, { model: e.target.value })}
                    className="w-56 rounded-lg border border-line px-3 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Color"
                    value={l.color}
                    onChange={(e) => setLine(idx, { color: e.target.value })}
                    className="w-28 rounded-lg border border-line px-3 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Qty"
                    inputMode="numeric"
                    value={l.qtyOrdered}
                    onChange={(e) => setLine(idx, { qtyOrdered: e.target.value })}
                    className="w-16 rounded-lg border border-line px-3 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Unit cost (Rs.)"
                    inputMode="decimal"
                    value={l.unitCost}
                    onChange={(e) => setLine(idx, { unitCost: e.target.value })}
                    className="w-32 rounded-lg border border-line px-3 py-1.5 text-sm"
                  />
                  <span className="w-28 text-right text-xs text-ink-faint">
                    = Rs. {(n(l.qtyOrdered) * n(l.unitCost)).toLocaleString("en-PK")}
                  </span>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLines((ls) => ls.filter((_, i) => i !== idx))}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setLines((ls) => [...ls, { ...EMPTY_LINE }])}
              className="mt-2 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-slate-200"
            >
              + Add line
            </button>
            <input type="hidden" name="items" value={itemsJson} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Paid Now (Rs.)</span>
              <input name="amountPaid" placeholder="0 — rest is payable" inputMode="decimal" className="w-full rounded-lg border border-line px-3 py-2" />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium">Notes</span>
              <input name="notes" placeholder="batch details, transport, warranty terms…" className="w-full rounded-lg border border-line px-3 py-2" />
            </label>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <span className="text-sm font-medium">Computed Total</span>
            <span className="text-lg font-semibold">Rs. {total.toLocaleString("en-PK")}</span>
          </div>

          {state && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
          >
            {pending ? "Recording…" : "Record Purchase"}
          </button>
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
        className="rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
      >
        Pay
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-24 rounded-md border border-line px-2 py-1 text-xs" />
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
      <button onClick={() => setOpen(false)} className="text-xs text-ink-faint hover:text-ink-soft">✕</button>
    </span>
  );
}

/** #15: receive stock against one PO line. */
export function ReceiveItem({ itemId, remaining }: { itemId: number; remaining: number }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(String(remaining));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (remaining <= 0) return <span className="text-xs text-emerald-600">✔ all received</span>;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
      >
        Receive
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" className="w-14 rounded-md border border-line px-2 py-0.5 text-xs" />
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await receiveItemAction(itemId, Number(qty));
            setError(res && !res.ok ? (res.error ?? "Failed") : null);
            if (res?.ok) setOpen(false);
          })
        }
        className="rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "…" : "✔"}
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-ink-faint hover:text-ink-soft">✕</button>
    </span>
  );
}
