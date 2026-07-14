"use client";

import { useState, useTransition } from "react";
import { reviewActionAction } from "./actions";

export function ReviewControls({ pendingId }: { pendingId: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const run = (decision: "approved" | "rejected") =>
    start(async () => {
      const res = await reviewActionAction(pendingId, decision, note || undefined);
      setError(res && !res.ok ? (res.error ?? "Failed") : null);
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && <span className="w-full text-xs text-red-600">{error}</span>}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="note (optional; recommended when rejecting)"
        className="w-64 rounded-md border border-slate-300 px-2 py-1 text-xs"
      />
      <button
        disabled={pending}
        onClick={() => run("approved")}
        className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "…" : "✔ Approve"}
      </button>
      <button
        disabled={pending}
        onClick={() => run("rejected")}
        className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
      >
        {pending ? "…" : "✕ Reject"}
      </button>
    </div>
  );
}
