"use client";

import { useActionState, useEffect, useState } from "react";
import { updateVehicleAction, type ActionState } from "./actions";

type VehicleRow = {
  id: number;
  make: string;
  model: string;
  variant: string | null;
  color: string | null;
  chassisNo: string;
  engineNo: string;
  salePrice: string | null;
  purchasePrice?: string | null;
  notes: string | null;
};

export function EditVehicleForm({
  row,
  showPurchasePrice,
}: {
  row: VehicleRow;
  showPurchasePrice: boolean;
}) {
  const [open, setOpen] = useState(false);
  const action = updateVehicleAction.bind(null, row.id);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-slate-100"
      >
        Edit
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <form
        action={formAction}
        className="w-full max-w-2xl card p-6 shadow-lg"
      >
        <h2 className="mb-4 text-sm font-semibold">Edit Vehicle — {row.make} {row.model}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field name="make" label="Make *" defaultValue={row.make} />
          <Field name="model" label="Model *" defaultValue={row.model} />
          <Field name="variant" label="Variant / Battery" defaultValue={row.variant ?? ""} />
          <Field name="color" label="Color" defaultValue={row.color ?? ""} />
          <Field name="chassisNo" label="Chassis / VIN *" defaultValue={row.chassisNo} />
          <Field name="engineNo" label="Engine / Motor No. *" defaultValue={row.engineNo} />
          {showPurchasePrice && (
            <Field name="purchasePrice" label="Purchase Price (Rs.)" defaultValue={row.purchasePrice ?? ""} />
          )}
          <Field name="salePrice" label="Sale Price (Rs.)" defaultValue={row.salePrice ?? ""} />

          <label className="text-sm sm:col-span-2 lg:col-span-3">
            <span className="mb-1 block font-medium">Notes</span>
            <textarea
              name="notes"
              rows={2}
              defaultValue={row.notes ?? ""}
              className="w-full rounded-lg border border-line px-3 py-2"
            />
          </label>
        </div>

        {state && !state.ok && <p className="mt-3 text-sm text-red-600">{state.error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-ink-soft hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          Branch is not editable here — inter-branch moves go through Gate Pass so the transfer trail stays intact.
        </p>
      </form>
    </div>
  );
}

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        name={name}
        required={label.includes("*")}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-slate-500"
      />
    </label>
  );
}
