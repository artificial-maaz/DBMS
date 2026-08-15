"use client";

import { useActionState, useEffect, useState } from "react";
import { updateRequirementAction, type ActionState } from "./actions";

export function EditRequirementForm({ requirement }: { requirement: { id: number; name: string } }) {
  const [open, setOpen] = useState(false);
  const action = updateRequirementAction.bind(null, requirement.id);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-md px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-raised">
        Rename
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input
        name="name"
        required
        defaultValue={requirement.name}
        className="rounded-lg border border-line px-2 py-1 text-sm"
      />
      <button type="submit" disabled={pending} className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50">
        {pending ? "…" : "Save"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="rounded-md px-2.5 py-1 text-xs font-medium text-ink-faint hover:bg-raised">
        Cancel
      </button>
      {state && !state.ok && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
