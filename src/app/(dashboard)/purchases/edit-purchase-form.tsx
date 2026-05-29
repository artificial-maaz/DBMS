"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { updatePurchaseAction, type ActionState } from "./actions";

type Opt = { id: number; label: string };

export type EditableLine = {
  id: number;
  model: string;
  color: string | null;
  qtyOrdered: number;
  qtyReceived: number;
  unitCost: string;
};

type Row = {
  /** Absent on a line added during this edit. */
  id?: number;
  model: string;
  color: string;
  qtyOrdered: string;
  unitCost: string;
  /** > 0 means locked: the cost is already baked into received inventory. */
  qtyReceived: number;
};

/**
 * #19 (Sir, 2026-08-09): fix a mistyped purchase order.
 *
 * The locking rule is enforced on the server; this form's job is to make it
 * obvious BEFORE anyone types. A line that has taken delivery renders read-only
 * with a "received" note rather than as an editable field that rejects on
 * submit — a form that lets you type and then refuses is worse than one that
 * never invited you.
 *
 * Branch and amount paid are absent entirely, not disabled: the ledger already
 * recorded both, and money moves only through Pay, never through an edit.
 */
export function EditPurchaseForm({
  poId,
  poNo,
  supplierId,
  purchaseDate,
  notes,
  amountPaid,
  lines,
  suppliers,
}: {
  poId: number;
  poNo: string;
  supplierId: number;
  purchaseDate: string;
  notes: string | null;
  amountPaid: string;
  lines: EditableLine[];
  suppliers: Opt[];
}) {
  const [open, setOpen] = useState(false);
  const action = updatePurchaseAction.bind(null, poId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);
  const [rows, setRows] = useState<Row[]>(() =>
    lines.map((l) => ({
      id: l.id,
      model: l.model,
      color: l.color ?? "",
      qtyOrdered: String(l.qtyOrdered),
      unitCost: l.unitCost,
      qtyReceived: l.qtyReceived,
    })),
  );

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  const n = (v: string) => {
    const x = Number(String(v).replace(/[,\s]/g, ""));
    return isNaN(x) ? 0 : x;
  };
  const total = useMemo(() => rows.reduce((acc, r) => acc + n(r.qtyOrdered) * n(r.unitCost), 0), [rows]);
  const belowPaid = total < Number(amountPaid);

  const itemsJson = useMemo(
    () =>
      JSON.stringify(
        rows
          .filter((r) => r.model.trim())
          .map((r) => ({
            ...(r.id ? { id: r.id } : {}),
            model: r.model,
            color: r.color,
            qtyOrdered: n(r.qtyOrdered),
            unitCost: r.unitCost,
          })),
      ),
    [rows],
  );

  const setRow = (idx: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const addRow = () =>
    setRows((rs) => [...rs, { model: "", color: "", qtyOrdered: "1", unitCost: "", qtyReceived: 0 }]);
  const removeRow = (idx: number) => setRows((rs) => rs.filter((_, i) => i !== idx));

  const trigger = (
    <button
      onClick={() => setOpen(true)}
      className="rounded-md px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors hover:bg-raised"
    >
      Edit
    </button>
  );

  if (!open) return trigger;

  // An overlay, not an inline panel: the Edit button lives in a tight flex row
  // beside the totals, and a multi-line editor opened in there would crush the
  // header. Fixed positioning also escapes the shell's per-column scrolling.
  return (
    <>
      {trigger}
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
        <form
          action={formAction}
          className="mx-auto mt-10 w-full max-w-3xl space-y-4 rounded-xl border border-line bg-surface p-5 text-left shadow-xl"
        >
      <p className="text-xs text-ink-faint">
        Editing <span className="font-mono font-medium">{poNo}</span>. Branch and amount paid cannot change here —
        both are already in the ledger. Lines that have taken delivery are locked.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Supplier *</span>
          <select
            name="supplierId"
            required
            defaultValue={String(supplierId)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2"
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Purchase Date *</span>
          <input
            type="date"
            name="purchaseDate"
            required
            defaultValue={purchaseDate}
            className="w-full rounded-lg border border-line px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Notes</span>
          <input name="notes" defaultValue={notes ?? ""} className="w-full rounded-lg border border-line px-3 py-2" />
        </label>
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => {
          const locked = r.qtyReceived > 0;
          return (
            <div key={r.id ?? `new-${i}`} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
              <div className="sm:col-span-4">
                <input
                  value={r.model}
                  onChange={(e) => setRow(i, { model: e.target.value })}
                  readOnly={locked}
                  placeholder="Model (e.g. Yadea G5 Pro) *"
                  className={`w-full rounded-lg border border-line px-3 py-2 ${locked ? "bg-surface text-ink-faint" : ""}`}
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  value={r.color}
                  onChange={(e) => setRow(i, { color: e.target.value })}
                  readOnly={locked}
                  placeholder="Colour"
                  className={`w-full rounded-lg border border-line px-3 py-2 ${locked ? "bg-surface text-ink-faint" : ""}`}
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  value={r.qtyOrdered}
                  onChange={(e) => setRow(i, { qtyOrdered: e.target.value })}
                  readOnly={locked}
                  inputMode="numeric"
                  placeholder="Qty"
                  className={`w-full rounded-lg border border-line px-3 py-2 ${locked ? "bg-surface text-ink-faint" : ""}`}
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  value={r.unitCost}
                  onChange={(e) => setRow(i, { unitCost: e.target.value })}
                  readOnly={locked}
                  inputMode="decimal"
                  placeholder="Unit cost"
                  className={`w-full rounded-lg border border-line px-3 py-2 ${locked ? "bg-surface text-ink-faint" : ""}`}
                />
              </div>
              <div className="flex items-center sm:col-span-2">
                {locked ? (
                  <span className="text-xs text-ink-faint">{r.qtyReceived} received — locked</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="rounded-md px-2.5 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <button
          type="button"
          onClick={addRow}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-brand-700 transition-colors hover:bg-surface"
        >
          + Add line
        </button>
      </div>

      <input type="hidden" name="items" value={itemsJson} readOnly />

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-3 text-sm">
        <span className="font-medium">New total: Rs. {total.toLocaleString("en-PK")}</span>
        <span className="text-ink-faint">Already paid: Rs. {Number(amountPaid).toLocaleString("en-PK")}</span>
        {belowPaid && (
          <span className="text-red-600">
            Total is below what has already been paid — refund through the ledger first.
          </span>
        )}
      </div>

      {state && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={pending || belowPaid || rows.every((r) => !r.model.trim())}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-ink-faint transition-colors hover:bg-raised"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
