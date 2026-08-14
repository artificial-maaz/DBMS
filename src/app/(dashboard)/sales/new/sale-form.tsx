"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSaleAction, type SaleActionState } from "../actions";
import { needsWarrantyCard } from "@/modules/sales/warranty";
import { CustomerPicker } from "./customer-picker";

type Opt = {
  id: number;
  label: string;
  make?: string;
  model?: string;
  salePrice?: string | null;
  branchId?: number;
  /** make + model — used to bucket the dropdown into optgroups */
  group?: string;
  branchName?: string;
  ownBranch?: boolean;
};
type OpenBooking = { id: number; customerId: number; modelWanted: string; tokenAmount: string };
type PartOpt = { id: number; name: string; branchId: number; qty: number; price: string };
type PartLine = { partId: string; qty: string };
type Guarantor = { fullName: string; cnic: string; phone: string; address: string };
type Requirement = { id: number; name: string };
type DocRow = {
  requirementId: number;
  requirementName: string;
  provided: boolean;
  compensationAmount: string;
  compensationNote: string;
};
type HandoverRow = {
  requirementId: number;
  requirementName: string;
  handedOver: boolean;
  note: string;
};
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
  feeDefaults,
  requirements,
  handoverItems,
  parts,
  branches,
  defaultBranchId,
}: {
  vehicles: Opt[];
  customers: Opt[];
  showCommission: boolean;
  initialCustomerId?: string;
  openBookings: OpenBooking[];
  plans: Plan[];
  /** For registering a walk-in customer without leaving this page. */
  branches: { id: number; name: string }[];
  defaultBranchId?: number | null;
  /** #29: system-settings defaults pre-filling the registration fee split. */
  feeDefaults?: { excise: string; profit: string };
  requirements: Requirement[];
  /** #13: physical handover checklist master list — every sale, not just installment. */
  handoverItems: Requirement[];
  /** Spare parts in stock, any branch — filtered to the vehicle's branch below. */
  parts: PartOpt[];
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
  const [regGovt, setRegGovt] = useState(
    feeDefaults && Number(feeDefaults.excise) > 0 ? feeDefaults.excise : "",
  );
  const [regProfit, setRegProfit] = useState(
    feeDefaults && Number(feeDefaults.profit) > 0 ? feeDefaults.profit : "",
  );
  const [downpayment, setDownpayment] = useState("");
  const [months, setMonths] = useState("12");
  const [totalMarkup, setTotalMarkup] = useState("");
  // #21: at least one required for installment sales; empty array is a no-op for cash.
  const [guarantorList, setGuarantorList] = useState<Guarantor[]>([]);
  const addGuarantor = () =>
    setGuarantorList((g) => [...g, { fullName: "", cnic: "", phone: "", address: "" }]);
  const removeGuarantor = (i: number) => setGuarantorList((g) => g.filter((_, idx) => idx !== i));
  const updateGuarantor = (i: number, field: keyof Guarantor, value: string) =>
    setGuarantorList((g) => g.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));

  // #20: checklist is informational, not a hard gate — default everything "provided",
  // staff unchecks what's actually missing and can note a compensation instead.
  const [docChecklist, setDocChecklist] = useState<DocRow[]>(() =>
    requirements.map((r) => ({
      requirementId: r.id,
      requirementName: r.name,
      provided: true,
      compensationAmount: "",
      compensationNote: "",
    })),
  );
  const toggleDoc = (i: number) =>
    setDocChecklist((rows) =>
      rows.map((row, idx) =>
        idx === i
          ? { ...row, provided: !row.provided, ...(row.provided ? {} : { compensationAmount: "", compensationNote: "" }) }
          : row,
      ),
    );
  const updateDocField = (i: number, field: "compensationAmount" | "compensationNote", value: string) =>
    setDocChecklist((rows) => rows.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));

  // #13: physical handover checklist. Same "default everything ticked, untick
  // what is actually missing" behaviour as the documents above — but shown for
  // EVERY sale, because a cash buyer is owed their mirrors too.
  const [handoverList, setHandoverList] = useState<HandoverRow[]>(() =>
    handoverItems.map((h) => ({
      requirementId: h.id,
      requirementName: h.name,
      handedOver: true,
      note: "",
    })),
  );
  const toggleHandover = (i: number) =>
    setHandoverList((rows) =>
      rows.map((row, idx) =>
        idx === i ? { ...row, handedOver: !row.handedOver, ...(row.handedOver ? {} : { note: "" }) } : row,
      ),
    );
  const updateHandoverNote = (i: number, value: string) =>
    setHandoverList((rows) => rows.map((row, idx) => (idx === i ? { ...row, note: value } : row)));
  const pendingHandovers = handoverList.filter((h) => !h.handedOver).length;

  /**
   * Parts sold with the bike (2026-08-16). Only the SELECTED vehicle's branch is
   * offered: stock and the money it earns must leave the same branch or the
   * per-branch books drift, and the server rejects any other combination
   * anyway. Offering the impossible just wastes the counter's time.
   */
  const [partLines, setPartLines] = useState<PartLine[]>([]);
  const addPartLine = () => setPartLines((l) => [...l, { partId: "", qty: "1" }]);
  const removePartLine = (i: number) => setPartLines((l) => l.filter((_, idx) => idx !== i));
  const setPartLine = (i: number, patch: Partial<PartLine>) =>
    setPartLines((l) => l.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

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
  const branchParts = useMemo(
    () => (selectedVehicle?.branchId ? parts.filter((p) => p.branchId === selectedVehicle.branchId) : []),
    [parts, selectedVehicle],
  );
  const partsTotal = useMemo(
    () =>
      partLines.reduce((acc, l) => {
        const p = branchParts.find((bp) => String(bp.id) === l.partId);
        return acc + (p ? Number(p.price) * n(l.qty) : 0);
      }, 0),
    [partLines, branchParts],
  );
  const partsJson = useMemo(
    () =>
      JSON.stringify(
        partLines.filter((l) => l.partId && n(l.qty) > 0).map((l) => ({ partId: Number(l.partId), qty: n(l.qty) })),
      ),
    [partLines],
  );

  // Parts ADD to the invoice - the server derives the same figure from the
  // database, so this is a preview, never the source of truth.
  const total = useMemo(
    () => n(salePrice) - n(discount) + n(regGovt) + n(regProfit) + partsTotal,
    [salePrice, discount, regGovt, regProfit, partsTotal],
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
    if (state.queued) {
      return (
        <div className="max-w-lg space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-8">
          <p className="text-lg font-semibold text-amber-800">⏳ Sent for owner approval</p>
          <p className="text-sm text-amber-700">
            This sale is in the Review Queue. Once an owner approves it, the invoice is created, the
            vehicle is marked sold, and the ledger updates automatically. Track it under Review Queue.
          </p>
          <button
            onClick={() => router.push("/approvals")}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            View Review Queue
          </button>
        </div>
      );
    }
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
      <div className="space-y-4 card p-6 lg:col-span-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CustomerPicker
            customers={customers}
            value={customerId}
            onChange={(id) => {
              setCustomerId(id);
              setBookingId(""); // bookings list changes with the customer — don't carry a stale pick
            }}
            branches={branches}
            defaultBranchId={defaultBranchId ?? null}
            preselectedNote={Boolean(initialCustomerId)}
          />

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
              className="w-full rounded-lg border border-line bg-surface px-3 py-2"
            >
              <option value="">Select vehicle…</option>
              {/* Sir (2026-08-06): grouped by make+model so identical bikes sit
                  together, each row tagged with the branch holding it. */}
              {Object.entries(
                vehicles.reduce<Record<string, Opt[]>>((acc, v) => {
                  const key = v.group ?? "Other";
                  (acc[key] ??= []).push(v);
                  return acc;
                }, {}),
              ).map(([group, items]) => (
                <optgroup key={group} label={`${group}  (${items.length} in stock)`}>
                  {items.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                      {v.branchName ? `  ·  ${v.branchName}` : ""}
                    </option>
                  ))}
                </optgroup>
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
              className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-500"
            />
            <span className="mt-1 block text-xs text-ink-faint">Backdate this to record a past sale.</span>
          </label>
          <Money name="salePrice" label="Sale Price (Rs.) *" value={salePrice} onChange={setSalePrice} required />
          <Money name="discount" label="Discount (Rs.)" value={discount} onChange={setDiscount} />
          <Money name="registrationFeeGovt" label="Registration Fee — Govt (Rs.)" value={regGovt} onChange={setRegGovt} />
          <Money name="registrationFeeProfit" label="Registration Fee — Showroom (Rs.)" value={regProfit} onChange={setRegProfit} />
          {showCommission && (
            <Money name="commissionAmount" label="Salesperson Commission (Rs.)" value={undefined} onChange={undefined} />
          )}
        </div>

        <div className="border-t border-line pt-4">
          <span className="mb-2 block text-sm font-medium">Settlement Plan *</span>
          <div className="flex gap-3">
            {(["cash", "installment"] as const).map((p) => (
              <label
                key={p}
                className={`cursor-pointer rounded-lg border px-4 py-2 text-sm capitalize ${
                  plan === p ? "border-brand-500 bg-brand-50 font-medium text-brand-700" : "border-line"
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
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 sm:w-64"
                >
                  <option value="">Custom (fill manually)</option>
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                  <option value="9">9 Months</option>
                  <option value="12">12 Months</option>
                </select>
                <span className="mt-1 block text-xs text-ink-faint">
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
                className="w-full rounded-lg border border-line px-3 py-2"
              />
            </label>
            <Money name="totalMarkup" label="Total Markup (Rs.)" value={totalMarkup} onChange={setTotalMarkup} />
          </div>
        )}

        {plan === "installment" && (
          <div className="rounded-lg border border-line p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <span className="block text-sm font-medium">Guarantor(s) *</span>
                <span className="block text-xs text-ink-faint">At least one required for an installment sale.</span>
              </div>
              <button
                type="button"
                onClick={addGuarantor}
                className="rounded-md bg-raised px-3 py-1.5 text-xs font-medium text-ink-soft hover:brightness-95"
              >
                + Add Guarantor
              </button>
            </div>

            {guarantorList.length === 0 && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                No guarantor added yet — add at least one before finalizing.
              </p>
            )}

            <div className="space-y-3">
              {guarantorList.map((g, i) => (
                <div key={i} className="grid grid-cols-1 gap-3 rounded-lg bg-raised p-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-sm">
                    <span className="mb-1 block font-medium">Full Name *</span>
                    <input
                      value={g.fullName}
                      onChange={(e) => updateGuarantor(i, "fullName", e.target.value)}
                      className="w-full rounded-lg border border-line px-3 py-2"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block font-medium">CNIC *</span>
                    <input
                      value={g.cnic}
                      onChange={(e) => updateGuarantor(i, "cnic", e.target.value)}
                      placeholder="42201-1234567-1"
                      className="w-full rounded-lg border border-line px-3 py-2"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block font-medium">Phone *</span>
                    <input
                      value={g.phone}
                      onChange={(e) => updateGuarantor(i, "phone", e.target.value)}
                      placeholder="03001234567"
                      className="w-full rounded-lg border border-line px-3 py-2"
                    />
                  </label>
                  <div className="flex items-end gap-2">
                    <label className="flex-1 text-sm">
                      <span className="mb-1 block font-medium">Address</span>
                      <input
                        value={g.address}
                        onChange={(e) => updateGuarantor(i, "address", e.target.value)}
                        className="w-full rounded-lg border border-line px-3 py-2"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeGuarantor(i)}
                      className="rounded-md px-2.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Dynamic rows don't map to plain FormData — send the whole list as one JSON field. */}
            <input type="hidden" name="guarantors" value={JSON.stringify(guarantorList)} readOnly />
          </div>
        )}

        {plan === "installment" && docChecklist.length > 0 && (
          <div className="rounded-lg border border-line p-4">
            <span className="mb-1 block text-sm font-medium">Document Checklist</span>
            <span className="mb-3 block text-xs text-ink-faint">
              Uncheck anything the customer doesn&apos;t have yet — not required to finalize, but note a
              compensation if you&apos;re granting the deal anyway.
            </span>
            <div className="space-y-2">
              {docChecklist.map((d, i) => (
                <div key={d.requirementId} className="rounded-lg bg-raised p-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={d.provided} onChange={() => toggleDoc(i)} className="h-4 w-4" />
                    <span className="font-medium">{d.requirementName}</span>
                    {!d.provided && <span className="text-xs text-amber-600">missing — waived</span>}
                  </label>
                  {!d.provided && (
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="text-sm">
                        <span className="mb-1 block text-xs font-medium text-ink-faint">Compensation (Rs., optional)</span>
                        <input
                          value={d.compensationAmount}
                          onChange={(e) => updateDocField(i, "compensationAmount", e.target.value)}
                          inputMode="decimal"
                          placeholder="0"
                          className="w-full rounded-lg border border-line px-3 py-2"
                        />
                      </label>
                      <label className="text-sm">
                        <span className="mb-1 block text-xs font-medium text-ink-faint">Note</span>
                        <input
                          value={d.compensationNote}
                          onChange={(e) => updateDocField(i, "compensationNote", e.target.value)}
                          placeholder="e.g. will bring utility bill next week"
                          className="w-full rounded-lg border border-line px-3 py-2"
                        />
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <input type="hidden" name="documents" value={JSON.stringify(docChecklist)} readOnly />
          </div>
        )}

        {/* Parts & accessories on the invoice (2026-08-16). Hidden until a
            vehicle is chosen, because the branch decides what is sellable. */}
        {selectedVehicle && (
          <div className="rounded-lg border border-line p-4">
            <span className="mb-1 block text-sm font-medium">
              Parts &amp; Accessories
              {partsTotal > 0 && (
                <span className="ml-2 rounded-full bg-info-soft px-2 py-0.5 text-xs font-medium text-info">
                  +{fmt(partsTotal)}
                </span>
              )}
            </span>
            <span className="mb-3 block text-xs text-ink-faint">
              {branchParts.length === 0
                ? `No parts in stock at ${selectedVehicle.branchName ?? "this branch"}.`
                : "Helmets, covers, spares — added to this invoice and deducted from branch stock."}
            </span>

            {branchParts.length > 0 && (
              <div className="space-y-2">
                {partLines.map((l, i) => {
                  const p = branchParts.find((bp) => String(bp.id) === l.partId);
                  return (
                    <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                      <div className="sm:col-span-7">
                        <select
                          value={l.partId}
                          onChange={(e) => setPartLine(i, { partId: e.target.value })}
                          className="w-full rounded-lg border border-line bg-surface px-3 py-2"
                        >
                          <option value="">Select a part…</option>
                          {branchParts.map((bp) => (
                            <option key={bp.id} value={bp.id}>
                              {bp.name} — Rs. {Number(bp.price).toLocaleString("en-PK")} ({bp.qty} in stock)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          value={l.qty}
                          onChange={(e) => setPartLine(i, { qty: e.target.value })}
                          inputMode="numeric"
                          placeholder="Qty"
                          className="w-full rounded-lg border border-line px-3 py-2"
                        />
                      </div>
                      <div className="flex items-center justify-between sm:col-span-3">
                        <span className="text-sm text-ink-soft">
                          {p ? fmt(Number(p.price) * n(l.qty)) : "—"}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePartLine(i)}
                          className="rounded-md px-2 py-1 text-xs font-medium text-danger transition hover:bg-danger-soft"
                        >
                          Remove
                        </button>
                      </div>
                      {p && n(l.qty) > p.qty && (
                        <p className="text-xs text-danger sm:col-span-12">
                          Only {p.qty} in stock — reduce the quantity.
                        </p>
                      )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={addPartLine}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-brand-700 transition hover:bg-raised"
                >
                  + Add part
                </button>
              </div>
            )}
            <input type="hidden" name="parts" value={partsJson} readOnly />
          </div>
        )}

        {/* #13: shown for EVERY sale — cash buyers are owed their mirrors and
            charger too. Unticking records what is still owed instead of
            blocking the sale, same as the document checklist above. */}
        {handoverList.length > 0 && (
          <div className="rounded-lg border border-line p-4">
            <span className="mb-1 block text-sm font-medium">
              Handover Checklist
              {pendingHandovers > 0 && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {pendingHandovers} still owed
                </span>
              )}
            </span>
            <span className="mb-3 block text-xs text-ink-faint">
              Tick what actually goes out with the bike. Untick anything still owed to the customer and say why —
              this does not block the sale, it records the promise.
            </span>
            <div className="space-y-2">
              {handoverList.map((h, i) => (
                <div key={h.requirementId} className="rounded-lg bg-raised p-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={h.handedOver}
                      onChange={() => toggleHandover(i)}
                      className="h-4 w-4"
                    />
                    <span className="font-medium">{h.requirementName}</span>
                    {!h.handedOver && <span className="text-xs text-amber-600">not handed over</span>}
                  </label>
                  {!h.handedOver && (
                    <label className="mt-2 block text-sm">
                      <span className="mb-1 block text-xs font-medium text-ink-faint">Note</span>
                      <input
                        value={h.note}
                        onChange={(e) => updateHandoverNote(i, e.target.value)}
                        placeholder="e.g. mirrors on order, collect Friday"
                        className="w-full rounded-lg border border-line px-3 py-2"
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
            <input type="hidden" name="handovers" value={JSON.stringify(handoverList)} readOnly />
          </div>
        )}

        {/* #14: Yadea-only. Other makes have no card to send, so asking is noise
            that made the Review Queue warning meaningless. */}
        {needsWarrantyCard(selectedVehicle?.make) && (
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-raised px-3 py-2.5 text-sm">
            <input type="checkbox" name="warrantyCardSent" className="h-4 w-4 accent-emerald-600" />
            <span>
              <span className="font-medium">Warranty card photo sent to company</span>
              <span className="block text-xs text-ink-faint">
                Yadea requirement — starts the warranty clock. The owner sees this during review.
              </span>
            </span>
          </label>
        )}

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Notes</span>
          <textarea name="notes" rows={2} className="w-full rounded-lg border border-line px-3 py-2" />
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
          disabled={pending || creditExceedsDue || (plan === "installment" && guarantorList.length === 0)}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {pending ? "Finalizing…" : "Finalize Sale"}
        </button>
      </div>

      {/* Right: live preview */}
      <div className="h-fit space-y-3 card p-6 text-sm">
        <h2 className="font-semibold">Live Summary</h2>
        <Row k="Subtotal" v={fmt(n(salePrice))} />
        <Row k="Discount" v={`− ${fmt(n(discount))}`} />
        <Row k="Registration fee" v={fmt(n(regGovt) + n(regProfit))} />
        <div className="border-t border-line pt-2">
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
        className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-500"
      />
    </label>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : "text-ink-soft"}`}>
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}
