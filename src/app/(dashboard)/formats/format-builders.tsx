"use client";

import { useMemo, useState } from "react";
import {
  bookingMessage,
  partsOrderMessage,
  stockReport,
  transferMessage,
  type StockLine,
  type TransferUnit,
} from "@/modules/formats/templates";

type Branch = { id: number; name: string };

/**
 * Copy-to-clipboard with a confirmation the user can actually see.
 *
 * A silent copy is indistinguishable from a broken button, and this is used at
 * a counter with a customer waiting — the two seconds of doubt matter.
 */
function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          setCopied(false);
        }
      }}
      className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-brand-500 active:scale-95"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

/**
 * Editable output (Sir, 2026-08-15).
 *
 * This was a read-only `<pre>`. Real messages need a last-second line — "sold
 * to walk-in", a note to the group — and if the box cannot be edited, staff
 * paste into WhatsApp and fix it there, or worse, stop using the generator and
 * type the whole thing again.
 *
 * So it is a textarea now. The subtlety: it must keep following the form while
 * nobody has touched it, then get out of the way the moment someone types.
 * `dirty` is that latch. "Reset to generated" is the way back, and it appears
 * only once there is something to go back from.
 */
function Output({ text }: { text: string }) {
  const [draft, setDraft] = useState(text);
  const [dirty, setDirty] = useState(false);

  // Follow the form until the user takes over.
  const shown = dirty ? draft : text;

  return (
    <div className="mt-3 rounded-xl border border-line bg-raised p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Ready to paste — edit freely
        </span>
        <span className="flex items-center gap-2">
          {dirty && (
            <button
              onClick={() => {
                setDirty(false);
                setDraft(text);
              }}
              className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:bg-surface active:scale-95"
            >
              Reset to generated
            </button>
          )}
          <CopyButton text={shown} />
        </span>
      </div>
      <textarea
        value={shown}
        onChange={(e) => {
          setDirty(true);
          setDraft(e.target.value);
        }}
        rows={Math.min(Math.max(shown.split("\n").length + 1, 6), 22)}
        spellCheck={false}
        className="w-full resize-y rounded-lg border border-line bg-surface p-2.5 font-sans text-sm text-ink outline-none focus:border-brand-500"
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-500"
      />
    </label>
  );
}

/* ------------------------------------------------------------------ */

export function StockReportBuilder({
  branches,
  stockByBranch,
  cashByBranch,
}: {
  branches: Branch[];
  stockByBranch: Record<number, StockLine[]>;
  cashByBranch: Record<number, string>;
}) {
  const [branchId, setBranchId] = useState(branches[0]?.id ?? 0);
  const [todaysSale, setTodaysSale] = useState("");
  const [repairText, setRepairText] = useState("");

  const branch = branches.find((b) => b.id === branchId);
  const today = new Date().toLocaleDateString("en-GB", { timeZone: "Asia/Karachi" }).replace(/\//g, "/");

  // Repair bikes are not tracked as inventory status yet, so they stay a typed
  // line. One per line: "Model Colour Qty".
  const repairLines: StockLine[] = useMemo(
    () =>
      repairText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
          const parts = l.split(/\s+/);
          const qty = Number(parts[parts.length - 1]);
          const hasQty = !isNaN(qty);
          return {
            make: "",
            model: hasQty ? parts.slice(0, -2).join(" ") || parts[0] : l,
            color: hasQty ? parts[parts.length - 2] ?? null : null,
            qty: hasQty ? qty : 1,
          };
        }),
    [repairText],
  );

  const text = stockReport({
    branchName: branch?.name ?? "",
    date: today,
    lines: stockByBranch[branchId] ?? [],
    repairLines,
    todaysSale,
    cashInHand: cashByBranch[branchId],
  });

  return (
    <div className="card p-5">
      <h2 className="text-lg font-bold">Stock Report</h2>
      <p className="text-sm text-ink-faint">
        Built from live inventory, so the message and the system cannot disagree. Cash in hand is today&apos;s
        ledger net for that branch.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Branch</span>
          <select
            value={branchId}
            onChange={(e) => setBranchId(Number(e.target.value))}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <Field label="Today's sale" value={todaysSale} onChange={setTodaysSale} placeholder="e.g. cover secoty gift" />
        <label className="text-sm sm:col-span-3">
          <span className="mb-1 block font-medium">Repair bikes (one per line: Model Colour Qty)</span>
          <textarea
            value={repairText}
            onChange={(e) => setRepairText(e.target.value)}
            rows={2}
            placeholder="Classy Black 01"
            className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-500"
          />
        </label>
      </div>

      <Output text={text} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function BookingBuilder() {
  const [f, setF] = useState({
    customerName: "",
    bike: "",
    colour: "",
    contactNo: "",
    amountReceived: "",
    dateOfPayment: new Date().toLocaleDateString("en-GB", { timeZone: "Asia/Karachi" }),
  });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div className="card p-5">
      <h2 className="text-lg font-bold">Advance Booking / Token</h2>
      <p className="text-sm text-ink-faint">Post in the group as soon as the token is taken.</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Customer Name" value={f.customerName} onChange={set("customerName")} />
        <Field label="Bike" value={f.bike} onChange={set("bike")} placeholder="e.g. Yadea T5L" />
        <Field label="Colour" value={f.colour} onChange={set("colour")} />
        <Field label="Contact No" value={f.contactNo} onChange={set("contactNo")} placeholder="0310-XXXXXXX" />
        <Field label="Amount Received" value={f.amountReceived} onChange={set("amountReceived")} />
        <Field label="Date of Payment" value={f.dateOfPayment} onChange={set("dateOfPayment")} />
      </div>
      <Output text={bookingMessage(f)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function PartsOrderBuilder() {
  const [f, setF] = useState({ model: "", part: "", colour: "", qty: "1", tagPerson: "" });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div className="card p-5">
      <h2 className="text-lg font-bold">Parts Purchase Demand</h2>
      <p className="text-sm text-ink-faint">
        Payment first, always — then post this. Tag the responsible person at the company.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Model" value={f.model} onChange={set("model")} placeholder="e.g. Ruibin" />
        <Field label="Part" value={f.part} onChange={set("part")} placeholder="e.g. Turning Signal Rear Left" />
        <Field label="Colour" value={f.colour} onChange={set("colour")} placeholder="e.g. Glass" />
        <Field label="Qty" value={f.qty} onChange={set("qty")} />
        <Field
          label="Tag person (optional)"
          value={f.tagPerson}
          onChange={set("tagPerson")}
          placeholder="Ibrar Hussain Parts AfterSales Yadea"
        />
      </div>
      <Output text={partsOrderMessage(f)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function TransferBuilder({ branches }: { branches: Branch[] }) {
  const [date, setDate] = useState(new Date().toLocaleDateString("en-GB", { timeZone: "Asia/Karachi" }).replace(/\//g, "-"));
  const [toBranch, setToBranch] = useState(branches[0]?.name ?? "");
  const [units, setUnits] = useState<TransferUnit[]>([{ model: "", colour: "", qty: 1 }]);

  const setUnit = (i: number, patch: Partial<TransferUnit>) =>
    setUnits((u) => u.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const text = transferMessage({
    date,
    toBranch,
    units: units.filter((u) => u.model.trim()),
  });

  return (
    <div className="card p-5">
      <h2 className="text-lg font-bold">Bike Transfer</h2>
      <p className="text-sm text-ink-faint">
        Announce the transfer in the group. The physical movement still needs a Gate Pass in the system —
        this message does not replace it.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Date" value={date} onChange={setDate} />
        <label className="text-sm">
          <span className="mb-1 block font-medium">To Branch</span>
          <select
            value={toBranch}
            onChange={(e) => setToBranch(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 space-y-2">
        {units.map((u, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
            <div className="sm:col-span-5">
              <input
                value={u.model}
                onChange={(e) => setUnit(i, { model: e.target.value })}
                placeholder="Model (e.g. T5-L)"
                className="w-full rounded-lg border border-line px-3 py-2"
              />
            </div>
            <div className="sm:col-span-4">
              <input
                value={u.colour}
                onChange={(e) => setUnit(i, { colour: e.target.value })}
                placeholder="Colour"
                className="w-full rounded-lg border border-line px-3 py-2"
              />
            </div>
            <div className="sm:col-span-2">
              <input
                value={String(u.qty)}
                onChange={(e) => setUnit(i, { qty: Number(e.target.value) || 0 })}
                inputMode="numeric"
                placeholder="Qty"
                className="w-full rounded-lg border border-line px-3 py-2"
              />
            </div>
            <div className="flex items-center sm:col-span-1">
              <button
                type="button"
                onClick={() => setUnits((us) => us.filter((_, idx) => idx !== i))}
                className="rounded-md px-2 py-2 text-xs font-medium text-danger transition hover:bg-danger-soft"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setUnits((u) => [...u, { model: "", colour: "", qty: 1 }])}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-brand-700 transition hover:bg-raised"
        >
          + Add line
        </button>
      </div>

      <Output text={text} />
    </div>
  );
}
