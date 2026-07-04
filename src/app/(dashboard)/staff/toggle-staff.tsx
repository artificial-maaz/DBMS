"use client";

import { useState, useTransition } from "react";
import { toggleStaffAction } from "./actions";

export function ToggleStaff({ id, isActive }: { id: number; isActive: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await toggleStaffAction(id, !isActive);
            setError(res && !res.ok ? (res.error ?? "Failed") : null);
          })
        }
        className={`rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
          isActive ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        }`}
      >
        {pending ? "…" : isActive ? "Deactivate" : "Reactivate"}
      </button>
    </span>
  );
}
