"use client";

import { useState, useTransition } from "react";
import { warrantyCardSentAction } from "../actions";

export function WarrantyCard({ invoiceId, sent, canManage }: { invoiceId: number; sent: boolean; canManage: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
        ✔ warranty card sent to company
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
        ⚠ warranty card NOT sent
      </span>
      {canManage && (
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await warrantyCardSentAction(invoiceId);
              setError(res && !res.ok ? (res.error ?? "Failed") : null);
            })
          }
          className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 print:hidden"
        >
          {pending ? "…" : "Mark sent now"}
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
