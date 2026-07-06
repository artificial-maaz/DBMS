"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSaleAction, type SaleActionState } from "../actions";

type Opt = { id: number; label: string; make?: string; model?: string; salePrice?: string | null };
type OpenBooking = { id: number; customerId: number; modelWanted: string; tokenAmount: string };
type Plan = {
  id: number;
  company: string;
  model: string;
  cashPrice: string;
  advance: string;
  monthly3: string; total3: string;
  monthly6: string; total6: string;
  monthly9: string; total9: string;
  monthly12: string; total12: string;
};

const norm = (s: string) => s.trim().toLowerCase();

export function SaleForm({
  vehicles,
  customers,
  showCommission,
  initialCustomerId,
  openBookings,
  plans,
}: {
  vehicles: Opt[];
  customers: Opt[];
  showCommission: boolean;
  initialCustomerId?: string;
  openBookings: OpenBooking[];
  plans: Plan[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SaleActionState, FormData>(createSaleAction, null);
  const today = new Date().toISOString().slice(0, 10);

  const [customerId, setCustomerId] = useState(initialCustomerId ?? "");
  const [bookingId, setBookingId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [planDuration, setPlanDuration] = useState<"" | "3" | "6" | "9" | "12">("");
  const [plan, setPlan] = useState<"cash" | "installment">("cash");
  const [salePrice, setSalePrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [regGovt, setRegGovt] = useState("");
  const [regProfit, setRegProfit] = useState("");
  const [downpayment, setDownpayment] = useState("");
  const [months, setMonths] = useState("12");
  const [totalMarkup, setTotalMarkup] = useState("");

  // #16: does the selected vehicle match an active company rate card?
  const selectedVehicle = vehicles.find((v) => String(v.id) === vehicleId);
  const matchedPlan = selectedVehicle?.make && selectedVehicle?.model
    ? plans.find((p) => norm(p.company) === norm(selectedVehicle.make!) && norm(p.model) === norm(selectedVehicle.model!))
    : undefined;

  const applyPlanDuration = (d: "" | "3" | "6" | "9" | "12") => {
    setPlanDuration(d);
    if (!matchedPlan || !d) return;
    const totalForDuration = Number((matchedPlan as unknown as Record<string, string>)[`total${d}`]);
    setDownpayment(matchedPlan.advance);
    setTotalMarkup(String(totalForDuration - Number(matchedPlan.cashPrice)));
    setMonths(d);
  };

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

  // #14: bookings tied to whichever customer is currently selected.
  const customerBookings = openBookings.filter((b) => String(b.customerId) === customerId);
  const selectedBooking = customerBookings.find((b) => String(b.id) === bookingId);
  const bookingCredit = selectedBooking ? n(selectedBooking.tokenAmount) : 0;
  const amountDueTodayBase = plan === "installment" ? n(downpayment) : total;
  const cashToCollectToday = Math.max(amountDueTodayBase - bookingCredit, 0);
  const creditExceedsDue = bookingCredit > amountDueTodayBase;

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
            <select
              name="customerId"
              required
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setBookingId(""); // bookings list changes with the customer — don't carry a stale pick
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            {initialCustomerId && (
              <span className="mt-1 block text-xs text-emerald-600">Pre-selected from a converted visitor.</span>
            )}
          </label>

          {customerBookings.length > 0 && (
            <label className="text-sm">
              <span className="mb-1 block font-medium">Apply Booking Token</span>
              <select
                name="bookingId"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2"
              >
                <option value="">No booking to apply</option>
                {customerBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.modelWanted} — Rs. {Number(b.tokenAmount).toLocaleString("en-PK")} token
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="text-sm">
            <span className="mb-1 block font-medium">Vehicle (in stock) *</span>
            <select
              name="vehicleId"
              required
              value={vehicleId}
              onChange={(e) => {
                setVehicleId(e.target.value);
                setPlanDuration(""); // rate card changes with the vehicle — don't carry a stale duration pick
                const v = vehicles.find((x) => String(x.id) === e.target.value);
                const p = v?.make && v?.model
                  ? plans.find((pl) => norm(pl.company) === norm(v.make!) && norm(pl.model) === norm(v.model!))
                  : undefined;
                // Rate card price wins over the per-unit listed price — it's the company-approved number.
                if (p) setSalePrice(p.cashPrice);
                else if (v?.salePrice) setSalePrice(v.salePrice);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              <option value="">Select vehicle…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
            {matchedPlan && (
              <span className="mt-1 block text-xs text-emerald-600">
                ✓ Matches {matchedPlan.company} rate card
              </span>
            )}
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
            {matchedPlan && (
              <label className="text-sm sm:col-span-3">
                <span className="mb-1 block font-medium">Plan Duration (from {matchedPlan.company} rate card)</span>
                <select
                  value={planDuration}
                  onChange={(e) => applyPlanDuration(e.target.value as typeof planDuration)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:w-64"
                >
                  <option value="">Custom (fill manually)</option>
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                  <option value="9">9 Months</option>
                  <option value="12">12 Months</option>
                </select>
                <span className="mt-1 block text-xs text-slate-500">
                  Fills advance/monthly/markup below from the rate card — still fully editable after.
                </span>
              </label>
            )}
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

        {creditExceedsDue && (
          <p className="text-sm text-red-600">
            This booking&apos;s token (Rs. {bookingCredit.toLocaleString("en-PK")}) is more than what&apos;s due today
            (Rs. {amountDueTodayBase.toLocaleString("en-PK")}) — raise the downpayment or refund part of the booking
            first.
          </p>
        )}
        {state && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending || creditExceedsDue}
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
        {selectedBooking && (
          <div className="rounded-lg bg-emerald-50 p-3">
            <Row k="Booking token applied" v={`− ${fmt(bookingCredit)}`} />
            <div className="mt-1 border-t border-emerald-100 pt-1">
              <Row k="Cash to collect today" v={fmt(cashToCollectToday)} bold />
            </div>
          </div>
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
