"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { recordEntryAction, type ActionState } from "./actions";

type Branch = { id: number; name: string };

export function AddEntryForm({
  branches,
  categories,
  fixedBranchId,
}: {
  branches: Branch[];
  categories: readonly string[];
  fixedBranchId: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(recordEntryAction, null);
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
        {open ? "Close" : "+ Record Entry"}
      </button>

      {open && (
        <form
          ref={formRef}
          action={formAction}
          className="mt-4 grid grid-cols-1 gap-4 card p-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label className="text-sm">
            <span className="mb-1 block font-medium">Direction *</span>
            <select name="direction" required className="w-full rounded-lg border border-line bg-surface px-3 py-2">
              <option value="cash_out">Cash Out (expense)</option>
              <option value="cash_in">Cash In</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Payment Method *</span>
            <select name="paymentMethod" required className="w-full rounded-lg border border-line bg-surface px-3 py-2">
              <option value="cash">Cash</option>
              <option value="online">Online payment</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Category *</span>
            <select name="category" required className="w-full rounded-lg border border-line bg-surface px-3 py-2">
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Amount (Rs.) *</span>
            <input
              name="amount"
              required
              inputMode="decimal"
              placeholder="e.g. 110000"
              className="w-full rounded-lg border border-line px-3 py-2"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Date *</span>
            <input
              name="entryDate"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-lg border border-line px-3 py-2"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Branch *</span>
            {fixedBranchId ? (
              <>
                <input type="hidden" name="branchId" value={fixedBranchId} />
                <input
                  disabled
                  value={branches.find((b) => b.id === fixedBranchId)?.name ?? "Your branch"}
                  className="w-full rounded-lg border border-line bg-slate-50 px-3 py-2"
                />
              </>
            ) : (
              <select name="branchId" required className="w-full rounded-lg border border-line bg-surface px-3 py-2">
                <option value="">Select branch…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </label>

          <label className="text-sm sm:col-span-2 lg:col-span-3">
            <span className="mb-1 block font-medium">Description *</span>
            <input
              name="description"
              required
              placeholder="e.g. Paid rent for showroom building — February"
              className="w-full rounded-lg border border-line px-3 py-2"
            />
          </label>

          {state && !state.ok && (
            <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{state.error}</p>
          )}

          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {pending ? "Recording…" : "Record Entry"}
            </button>
            <p className="mt-2 text-xs text-ink-faint">
              Entries cannot be edited or deleted — mistakes are corrected with a reversing entry.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
