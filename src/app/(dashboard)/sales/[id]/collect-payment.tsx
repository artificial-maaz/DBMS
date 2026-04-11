"use client";

import { useActionState, useState } from "react";
import { collectPaymentAction, type SaleActionState } from "../actions";

export function CollectPayment({ scheduleId, remaining }: { scheduleId: number; remaining: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<SaleActionState, FormData>(collectPaymentAction, null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-500 print:hidden"
      >
        Collect
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center justify-end gap-2 print:hidden">
      <input type="hidden" name="scheduleId" value={scheduleId} />
      <input
        name="amount"
        defaultValue={remaining}
        inputMode="decimal"
        className="w-24 rounded-md border border-line px-2 py-1 text-xs"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "…" : "✔"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-ink-faint hover:text-ink-soft">
        ✕
      </button>
      {state && !state.ok && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
