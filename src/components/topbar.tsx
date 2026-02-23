"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { ThemeToggle } from "./theme-toggle";

export function Topbar({
  name,
  role,
  notifications = 0,
}: {
  name: string;
  role: string;
  notifications?: number;
}) {
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 md:px-6 print:hidden">
      {/* Icon sits inside the field on the left with the label beside it —
          centring the placeholder read as an empty box (Sir, 2026-08-06). */}
      <form action="/search" className="relative min-w-0 flex-1 md:max-w-sm md:flex-none">
        <svg
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" />
        </svg>
        <input
          name="q"
          placeholder="Search"
          aria-label="Search"
          /* h-11 matches the collapse button exactly, so the two sit on the
             same optical row instead of one floating in a taller box. */
          className="h-11 w-full rounded-xl border border-line bg-raised pl-10 pr-4 text-sm outline-none transition focus:border-brand-400 focus:bg-surface focus:ring-4 focus:ring-brand-100"
        />
      </form>
      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        {role === "creator" && (
          <a
            href="/notifications"
            title="Notifications"
            className="relative flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-line text-sm transition hover:border-brand-300 hover:bg-brand-50 active:scale-95"
          >
            🔔
            {notifications > 0 && (
              <span className="animate-pop absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
                {notifications > 99 ? "99+" : notifications}
              </span>
            )}
          </a>
        )}
        <ThemeToggle />
        {/* Name hides on phones — the role chip is the useful part there */}
        <span className="hidden text-sm font-medium sm:inline">{name}</span>
        {/* Back to a brand tint — now readable in dark because the text uses
            --chip-ink rather than a chart-weight shade. */}
        <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-medium capitalize text-brand-700">
          {role.replace("_", " ")}
        </span>
        <button
          onClick={handleLogout}
          className="min-h-10 rounded-xl border border-line px-3 text-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 active:scale-95"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
