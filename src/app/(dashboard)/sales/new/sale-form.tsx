"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSaleAction, type SaleActionState } from "../actions";

type Opt = { id: number; label: string; salePrice?: string | null };

export function SaleForm({
  vehicles,
  customers,
  showCommission,
}: {
  vehicles: Opt[];
  customers: Opt[];
  showCommission: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SaleActionState, FormData>(createSaleAction, null);
  const today = new Date().toISOString().slice(0, 10);

  const [vehicleId, setVehicleId] = useState("");
  const [plan, setPlan] = useState<"cash" | "installment">("cash");
  const [salePrice, setSalePrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [regGovt, setRegGovt] = useState("");
  const [regProfit, setRegProfit] = useState("");
  const [downpayment, setDownpayment] = useState("");
  const [months, setMonths] = useState("12");
  const [totalMarkup, setTotalMarkup] = useState("");

  const n = (v: string) => {
    const x = Number(String(v).replace(/[,\s]/g, ""));
    return isNaN(x) ? 0 : x;
  };
  const total = useMemo(
    () => n(salePrice) - n(discount) + n(regGovt) + n(regProfit),
    [salePrice, discount, regGovt, regProfit],
  );
  const principal = Math.max(total - n(downpayment), 0);
  const monthly = plan === "installment" && n(months) > 0 ? (principal + n(totalMarkup)) / n(months) : 0;
  const fmt = (v: number) => `Rs. ${v.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;

  if (state?.ok) {
    return (
      <div className="max-w-lg space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-8">
        <p className="text-lg font-semibold text-emerald-800">✔ Sale finalized</p>
        <p className="text-sm text-emerald-700">
          Invoice <span className="font-mono font-semibold">{state.invoiceNo}</span> created. Vehicle marked
          sold, ledger updated{plan === "installment" && ", installment schedule generated"}.
        </p>
        <button
          onClick={() => router.push("/sales")}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
        >
          Back to Sales
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left: inputs */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Customer *</span>
            <select name="customerId" required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Vehicle (in stock) *</span>
            <select
              name="vehicleId"
              required
              value={vehicleId}
              onChange={(e) => {
                setVehicleId(e.target.value);
                const v = vehicles.find((x) => String(x.id) === e.target.value);
                if (v?.salePrice) setSalePrice(v.salePrice);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              <option value="">Select vehicle…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Sale Date *</span>
            <input
              type="date"
              name="saleDate"
              required
              defaultValue={today}
              max={today}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            />
            <span className="mt-1 block text-xs text-slate-400">Backdate this to record a past sale.</span>
          </label>
          <Money name="salePrice" label="Sale Price (Rs.) *" value={salePrice} onChange={setSalePrice} required />
          <Money name="discount" label="Discount (Rs.)" value={discount} onChange={setDiscount} />
          <Money name="registrationFeeGovt" label="Registration Fee — Govt (Rs.)" value={regGovt} onChange={setRegGovt} />
          <Money name="registrationFeeProfit" label="Registration Fee — Showroom (Rs.)" value={regProfit} onChange={setRegProfit} />
          {showCommission && (
            <Money name="commissionAmount" label="Salesperson Commission (Rs.)" value={undefined} onChange={undefined} />
          )}
        </div>

        <div className="border-t border-slate-100 pt-4">
          <span className="mb-2 block text-sm font-medium">Settlement Plan *</span>
          <div className="flex gap-3">
            {(["cash", "installment"] as const).map((p) => (
              <label
                key={p}
                className={`cursor-pointer rounded-lg border px-4 py-2 text-sm capitalize ${
                  plan === p ? "border-indigo-600 bg-indigo-50 font-medium text-indigo-700" : "border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="settlementPlan"
                  value={p}
                  checked={plan === p}
                  onChange={() => setPlan(p)}
                  className="sr-only"
                />
                {p}
              </label>
            ))}
          </div>
        </div>

        {plan === "installment" && (
          <div className="grid grid-cols-1 gap-4 rounded-lg bg-amber-50 p-4 sm:grid-cols-3">
            <Money name="downpayment" label="Advance Downpayment (Rs.) *" value={downpayment} onChange={setDownpayment} required />
            <label className="text-sm">
              <span className="mb-1 block font-medium">Months *</span>
              <input
                name="months"
                type="number"
                min={1}
                max={60}
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <Money name="totalMarkup" label="Total Markup (Rs.)" value={totalMarkup} onChange={setTotalMarkup} />
          </div>
        )}

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Notes</span>
          <textarea name="notes" rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>

        {state && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? "Finalizing…" : "Finalize Sale"}
        </button>
      </div>

      {/* Right: live preview */}
      <div className="h-fit space-y-3 rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <h2 className="font-semibold">Live Summary</h2>
        <Row k="Subtotal" v={fmt(n(salePrice))} />
        <Row k="Discount" v={`− ${fmt(n(discount))}`} />
        <Row k="Registration fee" v={fmt(n(regGovt) + n(regProfit))} />
        <div className="border-t border-slate-100 pt-2">
          <Row k="Total" v={fmt(total)} bold />
        </div>
        {plan === "installment" && (
          <>
            <Row k="Downpayment" v={`− ${fmt(n(downpayment))}`} />
            <Row k="Principal balance" v={fmt(principal)} />
            <Row k="Markup" v={fmt(n(totalMarkup))} />
            <div className="rounded-lg bg-amber-50 p-3">
              <Row k={`Monthly × ${months || "?"}`} v={fmt(monthly)} bold />
            </div>
          </>
        )}
      </div>
    </form>
  );
}

function Money({
  name,
  label,
  value,
  onChange,
  required,
}: {
  name: string;
  label: string;
  value?: string;
  onChange?: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        name={name}
        required={required}
        inputMode="decimal"
        placeholder="0"
        {...(onChange ? { value: value ?? "", onChange: (e) => onChange(e.target.value) } : {})}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
      />
    </label>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : "text-slate-600"}`}>
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}
