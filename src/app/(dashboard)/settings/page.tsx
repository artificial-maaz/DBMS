"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function SettingsPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const { error } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    });
    setMsg(
      error
        ? { ok: false, text: error.message ?? "Failed to change password" }
        : { ok: true, text: "Password changed. Other sessions were logged out." },
    );
    setLoading(false);
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-medium">Change password</h2>
        <input
          type="password"
          required
          placeholder="Current password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="New password (min 8 chars)"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        {msg && <p className={`text-sm ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Change password"}
        </button>
      </form>
    </div>
  );
}
