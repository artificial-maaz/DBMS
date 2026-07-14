"use client";

import { useState, useTransition } from "react";
import { documentCustodyAction } from "../actions";

const STATES = [
  { value: "given_to_customer", label: "Given to customer", cls: "bg-emerald-100 text-emerald-700" },
  { value: "held_by_dealer", label: "Held at dealership", cls: "bg-sky-100 text-sky-700" },
  { value: "pending", label: "Pending / not received", cls: "bg-amber-100 text-amber-700" },
] as const;

export function DocumentCustody({
  docId,
  custody,
  canManage,
}: {
  docId: number;
  custody: string;
  canManage: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const current = STATES.find((s) => s.value === custody) ?? STATES[2];

  if (!canManage) {
    return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${current.cls}`}>{current.label}</span>;
  }

  return (
    <span className="inline-flex items-center gap-2 print:hidden">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <select
        value={current.value}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            const res = await documentCustodyAction(docId, e.target.value as never);
            setError(res && !res.ok ? (res.error ?? "Failed") : null);
          })
        }
        className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${current.cls} ${pending ? "opacity-50" : ""}`}
      >
        {STATES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </span>
  );
}
