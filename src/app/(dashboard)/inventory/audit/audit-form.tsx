"use client";

import { useActionState } from "react";
import { stockAuditAction, type AuditResult } from "./actions";

type Branch = { id: number; name: string };

export function StockAuditForm({ branches, fixedBranchId }: { branches: Branch[]; fixedBranchId: number | null }) {
  const [state, formAction, pending] = useActionState<AuditResult, FormData>(stockAuditAction, null);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-medium">Scan Physical Showroom Stock</h2>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Branch *</span>
          {fixedBranchId ? (
            <>
              <input type="hidden" name="branchId" value={fixedBranchId} />
              <input
                disabled
                value={branches.find((b) => b.id === fixedBranchId)?.name ?? "Your branch"}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              />
            </>
          ) : (
            <select name="branchId" required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">Select branch…</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Chassis / VIN numbers *</span>
          <textarea
            name="vins"
            rows={10}
            required
            placeholder={"Scan barcodes or paste VINs here — one per line\nYD5PRO2026A00101\nUN70A2026B00201\n…"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
          />
          <span className="mt-1 block text-xs text-slate-400">
            Walk the floor, scan every bike's chassis barcode (scanners type into the box), then audit.
          </span>
        </label>

        {state && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? "Reconciling…" : "⟳ Audit Physical Stock"}
        </button>
      </form>

      <div className="space-y-4">
        {state?.ok && (
          <>
            <ResultCard
              tone="emerald"
              title={`Perfect Matches (${state.matched?.length ?? 0})`}
              subtitle="Physically present and recorded in the system — all good."
              items={state.matched ?? []}
              empty="No verified matches in this audit."
            />
            <ResultCard
              tone="red"
              title={`Missing Showroom Stock (${state.missing?.length ?? 0})`}
              subtitle="System says in stock, but NOT scanned physically — investigate immediately."
              items={(state.missing ?? []).map((m) => `${m.chassisNo} — ${m.label}`)}
              empty="Fantastic! No system vehicles are missing from the floor."
            />
            <ResultCard
              tone="amber"
              title={`Scanned but Unregistered (${state.unregistered?.length ?? 0})`}
              subtitle="On the floor but not in this branch's in-stock records — unregistered, transferred, or already sold."
              items={state.unregistered ?? []}
              empty="No unregistered scans found."
            />
          </>
        )}
        {!state?.ok && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-400">
            Results appear here after the audit: matches, missing stock, and unregistered scans.
          </div>
        )}
      </div>
    </div>
  );
}

const TONES: Record<string, { box: string; head: string }> = {
  emerald: { box: "border-emerald-200 bg-emerald-50", head: "text-emerald-800" },
  red: { box: "border-red-200 bg-red-50", head: "text-red-800" },
  amber: { box: "border-amber-200 bg-amber-50", head: "text-amber-800" },
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
