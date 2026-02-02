"use client";

import { useActionState, useState } from "react";
import { setStaffPasswordAction, type ActionState } from "./actions";

/**
 * Creator-only password reset (Sir, 2026-08-06). Stands in for self-service
 * email reset until company mailboxes exist — and stays afterwards, because
 * "my BM is locked out on a Sunday" is a permanent problem.
 */
export function ResetPasswordForm({ profileId, name }: { profileId: number; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    setStaffPasswordAction.bind(null, profileId),
    null,
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-100"
      >
        Reset password
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <form action={formAction} className="animate-rise card w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold">Reset password</h2>
            <p className="mb-4 mt-1 text-sm text-ink-soft">
              Set a temporary password for <span className="font-medium text-ink">{name}</span> and hand it
              over in person. They should change it from Settings after signing in.
            </p>

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">New password *</span>
              <input
                name="newPassword"
                type="text"
                required
                minLength={8}
                autoComplete="off"
                placeholder="at least 8 characters"
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 font-mono outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              />
              <span className="mt-1.5 block text-xs text-ink-faint">
                Shown as plain text on purpose — you need to read it out. All their existing sessions are
                signed out immediately.
              </span>
            </label>

            {state && !state.ok && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
            {state?.ok && <p className="mt-3 text-sm text-emerald-600">Password updated. They can sign in now.</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-line px-4 py-2 text-sm transition hover:bg-raised"
              >
                {state?.ok ? "Close" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500 active:scale-95 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Set password"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
