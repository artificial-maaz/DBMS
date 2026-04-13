"use client";

import { useTransition } from "react";
import { toggleHandoverItemAction } from "./actions";

/**
 * The raw `red-*` / `emerald-*` classes here match the Document Checklist
 * toggle deliberately. Both should move to the semantic status ramp together
 * when queue item C lands — a lone exception would just be a third pattern to
 * chase down later.
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
        isActive ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      }`}
    >
      {pending ? "…" : isActive ? "Retire" : "Reactivate"}
    </button>
  );
}
