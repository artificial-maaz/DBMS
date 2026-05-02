"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { quickCreateCustomerAction, type QuickCustomerState } from "../actions";

type Opt = { id: number; label: string };
type Branch = { id: number; name: string };

/**
 * Customer picker for New Sale (Sir, 2026-08-06).
 *
 * Two problems it solves:
 *  1. A plain <select> makes you hunt a long list. This filters as you type
 *     across name, phone and CNIC.
 *  2. A first-time buyer used to require a detour through the Customers module
 *     before the sale could even be started. Now they can be registered right
 *     here and are selected automatically.
 *
 * The chosen id rides in a hidden input, so the parent form still submits
 * `customerId` exactly as before — no changes needed on the server.
 */
export function CustomerPicker({
  customers,
  value,
  onChange,
  branches,
  defaultBranchId,
  preselectedNote,
}: {
  customers: Opt[];
  value: string;
  onChange: (id: string) => void;
  branches: Branch[];
  defaultBranchId: number | null;
  preselectedNote?: boolean;
}) {
  // Locally extended list so a just-created customer appears without a reload.
  const [list, setList] = useState<Opt[]>(customers);
  const [query, setQuery] = useState("");
  const [openList, setOpenList] = useState(false);
  const [adding, setAdding] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const selected = list.find((c) => String(c.id) === value) ?? null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list.slice(0, 50);
    return list.filter((c) => c.label.toLowerCase().includes(q)).slice(0, 50);
  }, [list, query]);

  // Click-away closes the dropdown.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpenList(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="text-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-medium">Customer *</span>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="text-xs font-medium text-brand-600 hover:underline"
        >
          {adding ? "Cancel" : "+ New customer"}
        </button>
      </div>

      <div ref={boxRef} className="relative">
        <input
          value={selected && !openList ? selected.label : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpenList(true);
            if (selected) onChange(""); // typing again clears the previous pick
          }}
          onFocus={() => {
            setOpenList(true);
            setQuery("");
          }}
          placeholder="Type a name, phone or CNIC…"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
        />

        {openList && (
          <ul className="animate-rise absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-[var(--shadow-lift)]">
            {matches.length === 0 && (
              <li className="px-3 py-3 text-ink-faint">
                No match.{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAdding(true);
                    setOpenList(false);
                  }}
                  className="font-medium text-brand-600 hover:underline"
                >
                  Register this customer
                </button>
              </li>
            )}
            {matches.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(String(c.id));
                    setOpenList(false);
                    setQuery("");
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left transition hover:bg-brand-50 ${
                    String(c.id) === value ? "bg-brand-50 font-medium text-brand-700" : ""
                  }`}
                >
                  {c.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* What the parent form actually submits. */}
      <input type="hidden" name="customerId" value={value} required />

      {preselectedNote && !adding && (
        <span className="mt-1 block text-xs text-emerald-600">Pre-selected from a converted visitor.</span>
      )}

      {adding && (
        <QuickAdd
          branches={branches}
          defaultBranchId={defaultBranchId}
          onCreated={(c) => {
            setList((l) => [c, ...l]);
            onChange(String(c.id));
            setAdding(false);
            setQuery("");
          }}
        />
      )}
    </div>
  );
}

/**
 * Inline registration. Deliberately NOT a nested <form> — HTML forbids that,
 * and it would submit the sale. Fields are collected manually and handed to the
 * server action, which keeps the outer sale form untouched.
 */
function QuickAdd({
  branches,
  defaultBranchId,
  onCreated,
}: {
  branches: Branch[];
  defaultBranchId: number | null;
  onCreated: (c: Opt) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [city, setCity] = useState("");
  const [branchId, setBranchId] = useState(defaultBranchId ? String(defaultBranchId) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("fullName", fullName);
    fd.set("phone", phone);
    fd.set("cnic", cnic);
    fd.set("city", city);
    fd.set("branchId", branchId);
    fd.set("email", "");
    fd.set("address", "");

    const res: QuickCustomerState = await quickCreateCustomerAction(null, fd);
    setBusy(false);
    if (res?.ok) onCreated(res.customer);
    else setError(res?.error ?? "Could not register this customer.");
  }

  return (
    <div className="animate-rise mt-2 rounded-xl border border-brand-200 bg-brand-50/60 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">New customer</p>
      <div className="grid grid-cols-2 gap-2">
        <Mini label="Full name *" value={fullName} onChange={setFullName} placeholder="Ahmed Khan" />
        <Mini label="Phone *" value={phone} onChange={setPhone} placeholder="0300 1234567" />
        <Mini label="CNIC" value={cnic} onChange={setCnic} placeholder="35202-1234567-1" mono />
        <Mini label="City" value={city} onChange={setCity} placeholder="Lahore" />
        <label className="col-span-2 text-xs">
          <span className="mb-1 block font-medium text-ink-soft">Branch *</span>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm"
          >
            <option value="">Select branch…</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={busy || !fullName.trim() || !phone.trim() || !branchId}
        className="mt-3 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-brand-500 active:scale-95 disabled:opacity-50"
      >
        {busy ? "Registering…" : "Register & select"}
      </button>
      <p className="mt-1.5 text-[11px] text-ink-faint">
        Saved straight into the Customers list — same validation and audit trail as the full form.
      </p>
    </div>
  );
}

function Mini({
  label,
  value,
  onChange,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <label className="text-xs">
      <span className="mb-1 block font-medium text-ink-soft">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-brand-400 ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}
