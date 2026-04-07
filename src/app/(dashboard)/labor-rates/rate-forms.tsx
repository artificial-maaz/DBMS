"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { addRateAction, toggleRateAction, updateRateAction, type ActionState } from "./actions";

type Rate = {
  id: number;
  serviceName: string;
  price: string;
  equipment: string | null;
  notes: string | null;
  isActive: boolean;
};

export function AddRateForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addRateAction, null);
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
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
      >
        {open ? "Close" : "+ Add Labor Service"}
      </button>

      {open && (
        <form
          ref={formRef}
          action={formAction}
          className="mt-4 grid grid-cols-1 gap-4 card p-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Field name="serviceName" label="Service / Repair Name *" placeholder="e.g. Engine overhauling" />
          <Field name="price" label="Labor Price (Rs.) *" placeholder="e.g. 1,500" />
          <Field name="equipment" label="Repair Equipment" placeholder="e.g. torque wrench, lift" />
          <Field name="notes" label="Notes" placeholder="optional" />

          {state && !state.ok && (
            <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-4">{state.error}</p>
          )}

          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Add Service"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function RateRow({ rate, canManage }: { rate: Rate; canManage: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateRateAction, null);
  const [togglePending, startToggle] = useTransition();

  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  if (editing) {
    return (
      <tr className="border-t border-line bg-brand-50/40">
        <td colSpan={5} className="px-4 py-3">
          <form action={formAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="rateId" value={rate.id} />
            <input name="serviceName" defaultValue={rate.serviceName} required className="w-64 rounded-lg border border-line px-3 py-1.5 text-sm" />
            <input name="price" defaultValue={rate.price} required className="w-28 rounded-lg border border-line px-3 py-1.5 text-sm" />
            <input name="equipment" defaultValue={rate.equipment ?? ""} placeholder="equipment" className="w-44 rounded-lg border border-line px-3 py-1.5 text-sm" />
            <input name="notes" defaultValue={rate.notes ?? ""} placeholder="notes" className="w-44 rounded-lg border border-line px-3 py-1.5 text-sm" />
            <button type="submit" disabled={pending} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
              {pending ? "…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs text-ink-faint hover:text-ink-soft">✕</button>
            {state && !state.ok && <span className="text-xs text-red-600">{state.error}</span>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`border-t border-line row-hover ${!rate.isActive ? "opacity-50" : ""}`}>
      <td className="px-4 py-2.5 font-medium">{rate.serviceName}</td>
      <td className="px-4 py-2.5 text-right">Rs. {Number(rate.price).toLocaleString("en-PK")}</td>
      <td className="px-4 py-2.5 text-ink-faint">{rate.equipment ?? "—"}</td>
      <td className="px-4 py-2.5">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${rate.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-ink-faint"}`}>
          {rate.isActive ? "active" : "retired"}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right">
        {canManage && (
          <span className="inline-flex items-center gap-2">
            <button onClick={() => setEditing(true)} className="rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100">
              Edit
            </button>
            <button
              disabled={togglePending}
              onClick={() => startToggle(async () => void (await toggleRateAction(rate.id, !rate.isActive)))}
              className={`rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                rate.isActive ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {togglePending ? "…" : rate.isActive ? "Retire" : "Reactivate"}
            </button>
          </span>
        )}
      </td>
    </tr>
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
        className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-slate-500"
      />
    </label>
  );
}
