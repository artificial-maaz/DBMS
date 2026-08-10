"use client";

import Link from "next/link";
import { useState } from "react";
import { requestPasswordReset } from "@/lib/auth-client";

/**
 * Forgot password (Sir, 2026-08-16) — live now that SMTP can reach a staff
 * member's inbox. Parked until tonight because a reset link that silently went
 * nowhere would have been worse than no link at all.
 *
 * SECURITY: the confirmation is deliberately identical whether or not the email
 * belongs to an account. Saying "no such user" would turn this page into a way
 * for anyone to test which addresses have access to the company's books.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await requestPasswordReset({ email, redirectTo: "/reset-password" });
    setBusy(false);

    /**
     * The privacy rule is "never reveal whether this email has an account".
     * It is NOT "hide every failure" — the first version of this page did the
     * latter and showed "Check your email" even when the server had refused
     * outright, which is how a broken reset can look like a working one.
     *
     * Better Auth answers a valid request with success whether or not the user
     * exists, so anything that comes back as an ERROR here is a fault on our
     * side: misconfiguration, mail transport, connectivity. None of those leak
     * anything about the account, so all of them are safe to show — and useless
     * to hide.
     */
    if (error) {
      const code = (error as { code?: string }).code ?? "";
      setError(
        code === "RESET_PASSWORD_DISABLED"
          ? "Password reset is not switched on for this server yet. Tell the admin — it is a settings change, not something you did."
          : `Could not send the reset link: ${error.message ?? code ?? "unknown error"}. Try again, or ask the admin for a temporary password.`,
      );
      return;
    }
    setSent(true);
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        {sent ? (
          <div className="card p-8">
            <h1 className="text-2xl font-bold">Check your email</h1>
            <p className="mt-3 text-ink-soft">
              If <span className="font-medium text-ink">{email}</span> belongs to an account, a reset link is on
              its way. It expires in one hour.
            </p>
            <p className="mt-3 text-sm text-ink-faint">
              Nothing after a few minutes? Check spam, or ask the admin to set a temporary password for you.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-500 active:scale-95"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="card p-8">
            <h1 className="text-2xl font-bold">Forgot your password?</h1>
            <p className="mt-2 text-sm text-ink-soft">
              Enter the email you sign in with and we&apos;ll send you a link to set a new password.
            </p>

            <label className="mt-6 block text-sm">
              <span className="mb-1 block font-medium">Email</span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@gmail.com"
                className="w-full rounded-xl border border-line px-3 py-3 outline-none focus:border-brand-500"
              />
            </label>

            {error && <p className="mt-3 text-sm text-danger">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="mt-5 w-full rounded-xl bg-brand-600 px-3 py-3 text-sm font-medium text-white transition hover:bg-brand-500 active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send reset link"}
            </button>

            <Link href="/login" className="mt-4 block text-center text-sm text-ink-faint hover:text-ink">
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
