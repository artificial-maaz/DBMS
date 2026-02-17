"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Abrar #3 (2026-07-14): responsive app shell. Staff run this on PHONES.
 * Desktop (md+): sidebar fixed as before. Mobile: sidebar becomes a slide-in
 * drawer behind a ☰ button; it closes automatically on navigation.
 * `sidebar` and `topbar` arrive as server-rendered children — this component
 * only owns the open/close state.
 */
export function Shell({
  sidebar,
  topbar,
  children,
  defaultCollapsed = false,
}: {
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
  children: React.ReactNode;
  /** Read from a cookie on the server so the sidebar never flashes open. */
  defaultCollapsed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]); // navigating closes the drawer

  /** Sir (2026-08-04): collapse the sidebar for more table room. Persisted in
   *  a cookie, same pattern as the theme, so it survives reloads. */
  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `sidebar=${next ? "closed" : "open"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    /**
     * Sir (2026-08-04): the sidebar and the content must scroll INDEPENDENTLY.
     * Previously the whole page was one scroll container, so dragging the
     * content also dragged the nav out of view.
     *
     * Now the shell is locked to the viewport (h-screen + overflow-hidden) and
     * each column owns its own scrollbar. `min-h-0` on the flex children is the
     * part people miss: without it a flex item refuses to shrink below its
     * content height and the inner overflow never activates.
     */
    <div className="flex h-screen overflow-hidden print:h-auto print:overflow-visible">
      {/* Mobile overlay — fades in rather than snapping */}
      {open && (
        <button
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="animate-fade fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar: fixed column on desktop, drawer on mobile. Scrolls itself. */}
      <div
        className={`fixed inset-y-0 left-0 z-40 h-screen overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:static md:z-auto md:h-auto md:translate-x-0 ${
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        } ${collapsed ? "md:w-0 md:opacity-0" : "md:w-60 md:opacity-100"}`}
      >
        <div className="h-full [&>aside]:h-full">{sidebar}</div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="z-20 flex shrink-0 items-center border-b border-line bg-surface/85 backdrop-blur print:hidden">
          {/* Hamburger — mobile only. min-h-11 keeps it a proper thumb target. */}
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="ml-3 min-h-11 min-w-11 rounded-xl border border-line text-lg leading-none transition active:scale-95 md:hidden"
          >
            ☰
          </button>
          {/* Desktop collapse — hides the nav entirely for wide tables */}
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
            title={collapsed ? "Show sidebar" : "Hide sidebar"}
            /* An SVG chevron, not a text glyph: glyphs sit on the font's
               baseline and refuse to centre in a square box however you pad
               them (Sir, 2026-08-06). */
            className="ml-3 hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-ink-soft transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 active:scale-95 md:inline-flex"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={collapsed ? "rotate-180" : ""}
            >
              <path d="M15 6 L9 12 L15 18" />
            </svg>
          </button>
          <div className="min-w-0 flex-1 [&>header]:border-b-0">{topbar}</div>
        </div>
        {/* key={pathname} replays the entrance animation on every navigation */}
        <main
          key={pathname}
          className="animate-rise min-h-0 flex-1 overflow-y-auto p-4 md:p-7 print:overflow-visible"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
