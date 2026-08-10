"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn.email({ email, password, callbackURL: "/" });
    if (error) setError(error.message ?? "Login failed");
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Email</span>
        <input
          type="email"
          required
          autoComplete="username"
          placeholder="user@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Password</span>
        <span className="relative block">
          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 pr-12 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          />
          {/* Sir (2026-08-06): reveal toggle. aria-label + aria-pressed so screen
              readers announce the state, not just the icon. */}
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-ink-faint transition hover:text-brand-600"
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </span>
      </label>

      {error && (
        <p className="animate-rise rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-brand-600 px-3 py-3 text-sm font-medium text-white transition hover:bg-brand-500 active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>

      {/* Live since 2026-08-16. It was parked while mail could only reach the
          Creator — a reset link that silently went nowhere would have been worse
          than none. SMTP through the company mailbox removed that blocker. */}
      <p className="pt-1 text-center text-xs">
        <Link href="/forgot-password" className="text-ink-faint underline-offset-2 hover:text-ink hover:underline">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}

function Eye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.4 3.4M6.6 6.6A18.4 18.4 0 0 0 2 12s3.5 7 10 7a10.8 10.8 0 0 0 5.4-1.4" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </svg>
  );
}
