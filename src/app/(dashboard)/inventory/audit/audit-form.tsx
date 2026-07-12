"use client";

import { useActionState } from "react";
import { stockAuditAction, type AuditResult } from "./actions";

type StockRow = { id: number; chassisNo: string; label: string };

/**
 * Manual walk-the-floor audit: the system's in-stock list becomes a checklist.
 * Staff tick each bike they can physically see — no scanners, no typing.
 */
export function StockAuditForm({ branchId, branchName, stock }: { branchId: number; branchName: string; stock: StockRow[] }) {
  const [state, formAction, pending] = useActionState<AuditResult, FormData>(stockAuditAction, null);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">System Stock — {branchName}</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {stock.length} expected
          </span>
        </div>
        <input type="hidden" name="branchId" value={branchId} />

        {stock.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No vehicles in stock at this branch.</p>
        ) : (
          <ul className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-100">
            {stock.map((v) => (
              <li key={v.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-50">
                  <input type="checkbox" name="present" value={v.id} className="h-5 w-5 accent-emerald-600" />
                  <span className="flex-1">
                    <span className="font-medium">{v.label}</span>
                    <span className="block font-mono text-xs text-slate-400">{v.chassisNo}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-slate-400">
          Walk the floor with this list. Tick every bike you can physically see, leave the rest unticked, then submit.
        </p>

        {state && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending || stock.length === 0}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? "Reconciling…" : "Submit Audit"}
        </button>
      </form>

      <div className="space-y-4">
        {state?.ok ? (
          <>
            <ResultCard
              tone="emerald"
              title={`Verified Present (${state.verified?.length ?? 0})`}
              subtitle="Seen on the floor and recorded in the system."
              items={(state.verified ?? []).map((m) => `${m.chassisNo} — ${m.label}`)}
              empty="Nothing was ticked as present."
            />
            <ResultCard
              tone="red"
              title={`Missing (${state.missing?.length ?? 0})`}
              subtitle="System says in stock, but not found on the floor — investigate."
              items={(state.missing ?? []).map((m) => `${m.chassisNo} — ${m.label}`)}
              empty="Perfect audit — every system vehicle is physically present."
            />
          </>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-400">
            Results appear here after submitting: verified stock and anything missing from the floor.
          </div>
        )}
      </div>
    </div>
  );
}

const TONES: Record<string, { box: string; head: string }> = {
  emerald: { box: "border-emerald-200 bg-emerald-50", head: "text-emerald-800" },
  red: { box: "border-red-200 bg-red-50", head: "text-red-800" },
};

function ResultCard({
  tone,
  title,
  subtitle,
  items,
  empty,
}: {
  tone: string;
  title: string;
  subtitle: string;
  items: string[];
  empty: string;
}) {
  const t = TONES[tone];
  return (
    <div className={`rounded-xl border p-5 ${t.box}`}>
      <p className={`font-semibold ${t.head}`}>{title}</p>
      <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto font-mono text-xs text-slate-700">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
