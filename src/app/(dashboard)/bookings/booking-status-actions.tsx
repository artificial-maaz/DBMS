"use client";

import { useState, useTransition } from "react";
import { bookingStatusAction } from "./actions";

export function BookingStatusActions({ id }: { id: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (status: "cancelled" | "refunded") => {
    if (status === "refunded" && !confirm("Refund this token? This posts a cash-out reversal to the ledger.")) return;
    start(async () => {
      const res = await bookingStatusAction(id, status);
      setError(res && !res.ok ? (res.error ?? "Failed") : null);
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        disabled={pending}
        onClick={() => run("cancelled")}
        className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50"
      >
        Cancel (keep token)
      </button>
      <button
        disabled={pending}
        onClick={() => run("refunded")}
        className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        Refund
      </button>
    </span>
  );
}
