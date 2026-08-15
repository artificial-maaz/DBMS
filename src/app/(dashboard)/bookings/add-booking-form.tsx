"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addBookingAction, type ActionState } from "./actions";

type Branch = { id: number; name: string };
type Person = { id: number; label: string };

export function AddBookingForm({
  branches,
  customers,
  visitors,
  fixedBranchId,
  defaultBranchId,
}: {
  branches: Branch[];
  customers: Person[];
  visitors: Person[];
  fixedBranchId: number | null;
  defaultBranchId?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [linkType, setLinkType] = useState<"customer" | "visitor">("customer");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addBookingAction, null);
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
        {open ? "Close" : "+ Register Token"}
      </button>

      {open && (
        <form
          ref={formRef}
          action={formAction}
          className="mt-4 grid grid-cols-1 gap-4 card p-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div className="sm:col-span-2 lg:col-span-3">
            <span className="mb-2 block text-sm font-medium">Who's this from? *</span>
            <div className="flex gap-3">
              {(["customer", "visitor"] as const).map((t) => (
                <label
                  key={t}
                  className={`cursor-pointer rounded-lg border px-4 py-2 text-sm capitalize ${
                    linkType === t ? "border-brand-500 bg-brand-50 font-medium text-brand-700" : "border-line"
                  }`}
                >
                  <input
                    type="radio"
                    name="linkType"
                    value={t}
                    checked={linkType === t}
                    onChange={() => setLinkType(t)}
                    className="sr-only"
                  />
                  {t === "customer" ? "Existing Customer" : "Visitor / Lead"}
                </label>
              ))}
            </div>
          </div>

          {linkType === "customer" ? (
            <label className="text-sm">
              <span className="mb-1 block font-medium">Customer *</span>
              <select name="customerId" required className="w-full rounded-lg border border-line bg-surface px-3 py-2">
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </label>
          ) : (
            <label className="text-sm">
              <span className="mb-1 block font-medium">Visitor *</span>
              <select name="visitorId" required className="w-full rounded-lg border border-line bg-surface px-3 py-2">
                <option value="">Select visitor…</option>
                {visitors.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            </label>
          )}

          <label className="text-sm">
            <span className="mb-1 block font-medium">Model Wanted *</span>
            <input name="modelWanted" required placeholder="e.g. Yadea G5 Pro, black" className="w-full rounded-lg border border-line px-3 py-2" />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Token Amount (Rs.) *</span>
            <input name="tokenAmount" required placeholder="e.g. 10,000" className="w-full rounded-lg border border-line px-3 py-2" />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Payment Method *</span>
            <select name="paymentMethod" required defaultValue="cash" className="w-full rounded-lg border border-line bg-surface px-3 py-2">
              <option value="cash">Cash</option>
              <option value="online">Online</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Branch *</span>
            {fixedBranchId ? (
              <>
                <input type="hidden" name="branchId" value={fixedBranchId} />
                <input
                  disabled
                  value={branches.find((b) => b.id === fixedBranchId)?.name ?? "Your branch"}
                  className="w-full rounded-lg border border-line bg-raised px-3 py-2"
                />
                <span className="mt-1 block text-xs text-ink-faint">Locked to your branch — tokens always post to your own branch's ledger.</span>
              </>
            ) : (
              <>
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
                <span className="mt-1 block text-xs text-ink-faint">Token posts to the CHOSEN branch's ledger; the sale must later happen at that branch.</span>
              </>
            )}
          </label>

          <label className="text-sm sm:col-span-2 lg:col-span-3">
            <span className="mb-1 block font-medium">Notes</span>
            <textarea name="notes" rows={2} className="w-full rounded-lg border border-line px-3 py-2" placeholder="Color preference, timeline, anything relevant to the order…" />
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
              {pending ? "Saving…" : "Register Token"}
            </button>
            <p className="mt-2 text-xs text-ink-faint">Posts immediately to the Cash Ledger as cash-in.</p>
          </div>
        </form>
      )}
    </div>
  );
}
