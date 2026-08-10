"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { resetPassword } from "@/lib/auth-client";

/**
 * Where the emailed reset link lands (Sir, 2026-08-16).
 *
 * The token arrives in the query string. Better Auth validates it server-side —
 * we never trust it here, we simply hand it back. An expired or reused token
 * fails there, which is why the error is shown verbatim rather than reworded:
 * "this link has expired" is genuinely what the person needs to read.
 */
function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError("The two passwords do not match.");
    if (password.length < 8) return setError("Use at least 8 characters.");

    setBusy(true);
    setError(null);
    const { error } = await resetPassword({ newPassword: password, token });
    setBusy(false);
    if (error) return setError(error.message ?? "That link is no longer valid. Request a new one.");
    setDone(true);
    setTimeout(() => router.push("/login"), 2200);
  };

  if (!token) {
    return (
      <div className="card p-8">
        <h1 className="text-2xl font-bold">Link incomplete</h1>
        <p className="mt-3 text-ink-soft">
          This page needs the link from your email. Open it directly from the message, or request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-500"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card p-8">
        <h1 className="text-2xl font-bold">Password changed</h1>
        <p className="mt-3 text-ink-soft">Taking you to the sign-in page…</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-8">
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      <p className="mt-2 text-sm text-ink-soft">At least 8 characters. Make it something you can recall.</p>

      <label className="mt-6 block text-sm">
        <span className="mb-1 block font-medium">New password</span>
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-line px-3 py-3 pr-11 outline-none focus:border-brand-500"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="absolute inset-y-0 right-0 px-3 text-ink-faint"
          >
            {show ? "🙈" : "👁"}
          </button>
        </div>
      </label>

      <label className="mt-4 block text-sm">
        <span className="mb-1 block font-medium">Confirm new password</span>
        <input
          type={show ? "text" : "password"}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-xl border border-line px-3 py-3 outline-none focus:border-brand-500"
        />
      </label>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-5 w-full rounded-xl bg-brand-600 px-3 py-3 text-sm font-medium text-white transition hover:bg-brand-500 active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* useSearchParams needs a Suspense boundary in the app router. */}
        <Suspense fallback={<div className="card p-8 text-ink-faint">Loading…</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </main>
  );
}
