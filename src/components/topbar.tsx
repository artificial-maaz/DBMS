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
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 print:hidden">
      <form action="/search" className="w-72">
        <input
          name="q"
          placeholder="Search VIN, CNIC, phone, invoice…"
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-slate-500 focus:bg-white"
        />
      </form>
      <div className="flex items-center gap-3">
        {role === "creator" && (
          <a
            href="/notifications"
            title="Notifications"
            className="relative rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm hover:bg-slate-100"
          >
            🔔
            {notifications > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
                {notifications > 99 ? "99+" : notifications}
              </span>
            )}
          </a>
        )}
        <ThemeToggle />
        <span className="text-sm font-medium">{name}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">
          {role.replace("_", " ")}
        </span>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
