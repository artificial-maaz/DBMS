"use client";

import { useTransition } from "react";
import { toggleHandoverItemAction } from "./actions";

/**
 * On the semantic status ramp (added 2026-08-09) along with the Document
 * Checklist and Installment Plan toggles — they were moved together, as the
 * note that used to sit here said they should be.
 */
export function ToggleHandoverItem({ id, isActive }: { id: number; isActive: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          await toggleHandoverItemAction(id, !isActive);
        })
      }
      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
        isActive ? "bg-danger-soft text-danger hover:brightness-95" : "bg-ok-soft text-ok hover:brightness-95"
      }`}
    >
      {pending ? "…" : isActive ? "Retire" : "Reactivate"}
    </button>
  );
}
