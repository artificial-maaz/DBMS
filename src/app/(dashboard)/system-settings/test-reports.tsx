"use client";

import { useState, useTransition } from "react";
import { sendTestReportAction } from "./actions";

export function TestReports() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const run = (kind: "daily" | "monthly" | "digest") =>
    start(async () => {
      const res = await sendTestReportAction(kind);
      setFailed(!res?.ok);
      setMsg(res?.ok ? `Sent — ${kind} email is on its way, check your inbox (and spam).` : (res?.error ?? "Failed"));
    });

  return (
    <div className="card p-6">
      <h2 className="mb-1 font-medium">Email Reports</h2>
      <p className="mb-3 text-sm text-ink-faint">
        Daily &amp; monthly reports go out automatically via the cron endpoints. Routine staff activity is
        batched into an <b>activity digest</b> a few times a day rather than one email per action — that is
        what keeps us inside the free email allowance. Only staff changes, settings changes and refunds
        email instantly.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={pending}
          onClick={() => run("daily")}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send test daily report"}
        </button>
        <button
          disabled={pending}
          onClick={() => run("monthly")}
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium row-hover disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send test monthly report"}
        </button>
        <button
          disabled={pending}
          onClick={() => run("digest")}
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium row-hover disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send activity digest now"}
        </button>
      </div>
      {msg && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            failed ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {msg}
        </p>
      )}
    </div>
  );
}
