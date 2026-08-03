"use client";

import { useMemo, useState } from "react";
import { ALL_FLOWS, visibleSteps, type Flow } from "@/modules/delivery-process/steps";

/**
 * The counter runbook. Deliberately NOT persisted (2026-08-15).
 *
 * Sir needed this in a branch manager's hands the morning after it was written,
 * on delivery day. A database-backed run would mean a migration and a new table
 * on the same morning the first real sale is entered — risk in exchange for a
 * record nobody has asked for yet. What the BM needs today is the ORDER of
 * operations and the two forks in it, on screen and on the wall.
 *
 * The per-sale record already exists: the Handover Checklist (#13) captures what
 * physically left with the bike, on the invoice, in the database. This teaches
 * the procedure around it. Persisting a run is a clean follow-up once the
 * process itself has survived contact with real customers.
 *
 * Tick state is in memory and resets on reload — correct for a checklist you
 * work through once per customer, standing at a counter.
 */
export function Runbook() {
  const [flowKey, setFlowKey] = useState(ALL_FLOWS[0].key);
  const [registration, setRegistration] = useState<boolean | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  const flow = ALL_FLOWS.find((f) => f.key === flowKey) ?? ALL_FLOWS[0];
  const steps = useMemo(() => visibleSteps(flow, registration), [flow, registration]);

  const required = steps.filter((s) => !s.onRequest);
  const completed = required.filter((s) => done.has(s.key)).length;
  const pct = required.length === 0 ? 0 : Math.round((completed / required.length) * 100);

  const toggle = (key: string) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const switchFlow = (f: Flow) => {
    setFlowKey(f.key);
    setRegistration(null);
    setDone(new Set());
  };

  const needsRegQuestion = flow.steps.some((s) => s.branch !== "always");

  return (
    <div className="space-y-5">
      {/* Flow picker */}
      <div className="flex flex-wrap gap-2 print:hidden">
        {ALL_FLOWS.map((f) => (
          <button
            key={f.key}
            onClick={() => switchFlow(f)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition active:scale-95 ${
              f.key === flowKey
                ? "bg-brand-600 text-white"
                : "border border-line bg-surface text-ink-soft hover:bg-raised"
            }`}
          >
            {f.title}
          </button>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">{flow.title}</h2>
            <p className="text-sm text-ink-faint">{flow.subtitle}</p>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            <div className="text-right">
              {/* Sir (2026-08-15): "0 of 2 done" read like a quantity — a stock
                  count or a number of bikes. It is the checklist progress, so it
                  now says what it is counting. */}
              <p className="text-xs text-ink-faint">
                {completed} of {required.length} steps ticked
              </p>
              <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-raised">
                <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <button
              onClick={() => setDone(new Set())}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-raised active:scale-95"
            >
              Reset
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-raised active:scale-95"
            >
              Print
            </button>
          </div>
        </div>

        {/* The registration fork — asked once, up front, because it changes
            what physically goes in the envelope. */}
        {needsRegQuestion && (
          <div className="mt-4 rounded-xl border border-warn/30 bg-warn-soft/60 p-4 print:hidden">
            <p className="text-sm font-semibold text-ink">Does the customer want vehicle registration?</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              Settle this before taking money — it decides who keeps the original document.
            </p>
            <div className="mt-3 flex gap-2">
              {[
                { label: "Yes — registering", value: true },
                { label: "No — not registering", value: false },
              ].map((o) => (
                <button
                  key={String(o.value)}
                  onClick={() => setRegistration(o.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition active:scale-95 ${
                    registration === o.value
                      ? "bg-brand-600 text-white"
                      : "border border-line bg-surface text-ink-soft hover:bg-raised"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <ol className="space-y-2">
        {steps.map((s, i) => {
          const ticked = done.has(s.key);
          return (
            <li
              key={s.key}
              className={`card flex gap-3 p-4 transition ${ticked ? "opacity-60" : ""} ${
                s.warning ? "border-danger/30" : ""
              }`}
            >
              <button
                onClick={() => toggle(s.key)}
                aria-pressed={ticked}
                aria-label={ticked ? `Mark "${s.title}" not done` : `Mark "${s.title}" done`}
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition active:scale-90 ${
                  ticked
                    ? "border-transparent bg-ok-soft text-ok"
                    : "border-line text-ink-faint hover:border-brand-400"
                }`}
              >
                {ticked ? "✓" : i + 1}
              </button>
              <div className="min-w-0">
                <p className={`font-medium ${ticked ? "line-through" : ""} ${s.warning ? "text-danger" : ""}`}>
                  {s.title}
                  {s.onRequest && (
                    <span className="ml-2 rounded-full bg-raised px-2 py-0.5 text-xs font-normal text-ink-faint">
                      only if asked
                    </span>
                  )}
                  {s.branch === "registration_yes" && (
                    <span className="ml-2 rounded-full bg-info-soft px-2 py-0.5 text-xs font-normal text-info">
                      registering
                    </span>
                  )}
                  {s.branch === "registration_no" && (
                    <span className="ml-2 rounded-full bg-info-soft px-2 py-0.5 text-xs font-normal text-info">
                      not registering
                    </span>
                  )}
                </p>
                {s.detail && <p className="mt-1 text-sm text-ink-soft">{s.detail}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-xs text-ink-faint print:hidden">
        Ticks are for this customer only and clear when you reload — this is a counter checklist, not a
        record. What physically left with the bike is recorded on the invoice&apos;s Handover Checklist.
      </p>
    </div>
  );
}
