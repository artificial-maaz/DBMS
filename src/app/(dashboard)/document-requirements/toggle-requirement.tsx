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
        isActive ? "bg-danger-soft text-danger hover:brightness-95" : "bg-ok-soft text-ok hover:brightness-95"
      }`}
    >
      {pending ? "…" : isActive ? "Retire" : "Reactivate"}
    </button>
  );
}
