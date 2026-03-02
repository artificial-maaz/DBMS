"use client";

import { useEffect, useState } from "react";

/**
 * Abrar #1 (2026-07-14): light/dark toggle. The choice is stored in a cookie
 * (so the server renders the right theme — no flash on load) and mirrored on
 * <html class="dark">. Since the GUI pass, dark styling comes from the design
 * tokens in globals.css, so flipping this class re-resolves every colour at
 * once — and the global colour transition makes it fade rather than snap.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    document.cookie = `theme=${next ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
    setDark(next);
  }

  return (
    <button
      onClick={toggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-line text-sm transition hover:border-brand-300 hover:bg-brand-50 active:scale-95"
    >
      <span key={String(dark)} className="animate-pop">
        {dark === null ? "◐" : dark ? "☀️" : "🌙"}
      </span>
    </button>
  );
}
