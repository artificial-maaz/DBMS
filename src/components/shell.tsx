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
}: {
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]); // navigating closes the drawer

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {open && (
        <button
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
        />
      )}

      {/* Sidebar: static on desktop, drawer on mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full [&>aside]:h-full">{sidebar}</div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center border-b border-slate-200 bg-white print:hidden">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="ml-3 rounded-lg border border-slate-300 px-3 py-1.5 text-lg leading-none md:hidden"
          >
            ☰
          </button>
          <div className="min-w-0 flex-1 [&>header]:border-b-0">{topbar}</div>
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
