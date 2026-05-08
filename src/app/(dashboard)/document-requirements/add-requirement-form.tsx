"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addRequirementAction, type ActionState } from "./actions";

export function AddRequirementForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addRequirementAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state]);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
      >
        {open ? "Close" : "+ Add Requirement"}
      </button>

      {open && (
        <form ref={formRef} action={formAction} className="mt-4 flex items-end gap-3 card p-6">
          <label className="flex-1 text-sm">
            <span className="mb-1 block font-medium">Requirement Name *</span>
            <input name="name" required placeholder="e.g. Utility Bill" className="w-full rounded-lg border border-line px-3 py-2" />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </form>
      )}
      {state && !state.ok && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
