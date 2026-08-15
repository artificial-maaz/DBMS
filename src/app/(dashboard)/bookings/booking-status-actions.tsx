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
      {/* #12 (Sir): these were the only action buttons in the app with no motion
          and no dark-mode colours — `bg-raised text-ink-soft` had no dark
          counterpart, so the Cancel button was a light chip on a dark card.
          Now on the shared treatment: transition + active:scale-95, tokens for
          the neutral button, the semantic danger ramp for the destructive one. */}
      <button
        disabled={pending}
        onClick={() => run("cancelled")}
        className="rounded-md bg-raised px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:bg-brand-50 hover:text-brand-700 active:scale-95 disabled:opacity-50"
      >
        Cancel (keep token)
      </button>
      <button
        disabled={pending}
        onClick={() => run("refunded")}
        className="rounded-md bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger transition hover:brightness-95 active:scale-95 disabled:opacity-50"
      >
        Refund
      </button>
    </span>
  );
}
