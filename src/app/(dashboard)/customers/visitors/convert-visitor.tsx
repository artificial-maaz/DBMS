"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { convertVisitorAction } from "./actions";

export function ConvertVisitor({ id }: { id: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await convertVisitorAction(id);
            if (!res || !res.ok) {
              setError(res?.error ?? "Failed to convert");
              return;
            }
            // Straight into New Sale with this customer pre-selected — that's the point of converting.
            router.push(`/sales/new?customerId=${res.customerId}`);
          })
        }
        className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
      >
        {pending ? "Converting…" : "Convert → Sale"}
      </button>
    </span>
  );
}
