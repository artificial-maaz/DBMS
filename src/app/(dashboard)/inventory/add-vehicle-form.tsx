"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addVehicleAction, type ActionState } from "./actions";

type Branch = { id: number; name: string };

export function AddVehicleForm({
  branches,
  showPurchasePrice,
  fixedBranchId,
}: {
  branches: Branch[];
  showPurchasePrice: boolean;
  fixedBranchId: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addVehicleAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state]);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        {open ? "Close" : "+ Add Vehicle"}
      </button>

      {open && (
        <form
          ref={formRef}
          action={formAction}
          className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Field name="make" label="Make *" placeholder="e.g. Yadea" />
          <Field name="model" label="Model *" placeholder="e.g. G5 Pro" />
          <Field name="variant" label="Variant / Battery" placeholder="e.g. 72V 38Ah" />
          <Field name="color" label="Color" placeholder="e.g. Black" />
          <Field name="chassisNo" label="Chassis / VIN *" placeholder="unique" />
          <Field name="engineNo" label="Engine / Motor No. *" placeholder="unique" />
          {showPurchasePrice && (
            <Field name="purchasePrice" label="Purchase Price (Rs.)" placeholder="e.g. 250000" />
          )}
          <Field name="salePrice" label="Sale Price (Rs.)" placeholder="e.g. 285000" />

          <label className="text-sm">
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
              <select
                name="branchId"
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              >
                <option value="">Select branch…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </label>

          <label className="text-sm sm:col-span-2 lg:col-span-3">
            <span className="mb-1 block font-medium">Notes</span>
            <textarea
              name="notes"
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Battery warranty, condition, observations…"
            />
          </label>

          {state && !state.ok && (
            <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{state.error}</p>
          )}

          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save Vehicle"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        name={name}
        required={label.includes("*")}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
      />
    </label>
  );
}
