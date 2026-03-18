"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { addPartAction, removePartAction, type ActionState } from "../actions";

type PartOpt = { id: number; name: string; currentQty: number; retailPrice: string | null };

export function AddJobPart({ jobId, parts }: { jobId: number; parts: PartOpt[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addPartAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="jobId" value={jobId} />
      <select name="partId" required className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm">
        <option value="">Select part…</option>
        {parts.map((p) => (
          <option key={p.id} value={p.id} disabled={p.currentQty === 0}>
            {p.name} — {p.currentQty} in stock{p.retailPrice ? ` @ Rs. ${Number(p.retailPrice).toLocaleString("en-PK")}` : ""}
          </option>
        ))}
      </select>
      <input
        name="qty"
        type="number"
        min={1}
        defaultValue={1}
        required
        className="w-16 rounded-lg border border-line px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add Part"}
      </button>
      {state && !state.ok && <span className="text-sm text-red-600">{state.error}</span>}
    </form>
  );
}

export function RemoveJobPart({ lineId }: { lineId: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await removePartAction(lineId);
            setError(res && !res.ok ? (res.error ?? "Failed") : null);
          })
        }
        className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        {pending ? "…" : "Remove"}
      </button>
    </span>
  );
}
