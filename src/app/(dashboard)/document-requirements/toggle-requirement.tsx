"use client";

import { useTransition } from "react";
import { toggleRequirementAction } from "./actions";

export function ToggleRequirement({ id, isActive }: { id: number; isActive: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          await toggleRequirementAction(id, !isActive);
        })
      }
      className={`rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
        isActive ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      }`}
    >
      {pending ? "…" : isActive ? "Retire" : "Reactivate"}
    </button>
  );
}
