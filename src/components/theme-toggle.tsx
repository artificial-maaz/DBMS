"use client";

import { useEffect, useState } from "react";

/**
 * Abrar #1 (2026-07-14): light/dark toggle. The choice is stored in a cookie
 * (so the server renders the right theme — no flash on load) and mirrored on
 * <html class="dark">. Dark styling itself lives in globals.css overrides.
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
      className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm hover:bg-slate-100"
    >
      {dark === null ? "◐" : dark ? "☀️" : "🌙"}
    </button>
  );
}
