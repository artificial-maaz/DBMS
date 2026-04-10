"use client";

import { useActionState, useEffect, useState } from "react";
import { updateHandoverItemAction, type ActionState } from "./actions";

export function EditHandoverItemForm({ item }: { item: { id: number; name: string } }) {
  const [open, setOpen] = useState(false);
  const action = updateHandoverItemAction.bind(null, item.id);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors hover:bg-raised"
      >
        Rename
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input name="name" required defaultValue={item.name} className="rounded-lg border border-line px-2 py-1 text-sm" />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
      >
        {pending ? "…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-md px-2.5 py-1 text-xs font-medium text-ink-faint transition-colors hover:bg-raised"
      >
        Cancel
      </button>
      {state && !state.ok && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
