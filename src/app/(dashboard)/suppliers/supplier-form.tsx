"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { addSupplierAction, toggleSupplierAction, updateSupplierAction, type ActionState } from "./actions";

export type SupplierData = {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  ntn: string | null;
  notes: string | null;
  isActive: boolean;
};

export function AddSupplierForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addSupplierAction, null);
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
        {open ? "Close" : "+ Register Supplier"}
      </button>

      {open && (
        <form
          ref={formRef}
          action={formAction}
          className="mt-4 grid grid-cols-1 gap-4 card p-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Field name="name" label="Supplier / Manufacturer Name *" placeholder="e.g. Yadea Pakistan" />
          <Field name="contactPerson" label="Contact Person" placeholder="e.g. Mr. Adnan Shah" />
          <Field name="phone" label="Phone" placeholder="0312-XXXXXXX" />
          <Field name="email" label="Email" placeholder="info@supplier.pk" />
          <Field name="city" label="City" placeholder="e.g. Karachi" />
          <Field name="ntn" label="NTN / Tax Reg." placeholder="NTN-XXXXXXX-X" />
          <label className="text-sm sm:col-span-2 lg:col-span-3">
            <span className="mb-1 block font-medium">Notes / Specialization</span>
            <input name="notes" placeholder="e.g. specializes in 2000W motors" className="w-full rounded-lg border border-line px-3 py-2" />
          </label>

          {state && !state.ok && (
            <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{state.error}</p>
          )}

          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Register Supplier"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/**
 * #19 (Sir, 2026-08-09): contact people move on and names get mistyped, so
 * every field is editable. Nothing on a supplier is referenced by the ledger,
 * so unlike a purchase order there is no money integrity to protect here.
 *
 * This owns the whole ROW rather than a single cell: a supplier has seven
 * fields, and the only place a seven-field form fits inside a table is a
 * full-width row of its own. Cramming it into the name cell would blow the
 * column widths apart the moment anyone clicked Edit.
 */
export function SupplierRow({ supplier, columns }: { supplier: SupplierData; columns: number }) {
  const [open, setOpen] = useState(false);
  const [togglePending, startToggle] = useTransition();
  const action = updateSupplierAction.bind(null, supplier.id);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  if (open) {
    return (
      <tr className="border-t border-line">
        <td colSpan={columns} className="bg-raised px-4 py-4">
          <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field name="name" label="Supplier / Manufacturer Name *" defaultValue={supplier.name} />
            <Field name="contactPerson" label="Contact Person" defaultValue={supplier.contactPerson ?? ""} />
            <Field name="phone" label="Phone" defaultValue={supplier.phone ?? ""} />
            <Field name="email" label="Email" defaultValue={supplier.email ?? ""} />
            <Field name="city" label="City" defaultValue={supplier.city ?? ""} />
            <Field name="ntn" label="NTN / Tax Reg." defaultValue={supplier.ntn ?? ""} />
            <label className="text-sm sm:col-span-2 lg:col-span-3">
              <span className="mb-1 block font-medium">Notes / Specialization</span>
              <input
                name="notes"
                defaultValue={supplier.notes ?? ""}
                className="w-full rounded-lg border border-line px-3 py-2"
              />
            </label>

            {state && !state.ok && <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{state.error}</p>}

            <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-3">
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
                className="rounded-lg px-4 py-2 text-sm font-medium text-ink-faint transition-colors hover:bg-surface"
              >
                Cancel
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-line row-hover">
      <td className="px-4 py-2.5 font-medium">{supplier.name}</td>
      <td className="px-4 py-2.5">{supplier.contactPerson ?? "—"}</td>
      <td className="px-4 py-2.5 text-ink-faint">
        {supplier.phone ?? "—"}
        {supplier.email ? ` · ${supplier.email}` : ""}
      </td>
      <td className="px-4 py-2.5">{supplier.city ?? "—"}</td>
      <td className="px-4 py-2.5 font-mono text-xs">{supplier.ntn ?? "—"}</td>
      <td className="px-4 py-2.5">
        {supplier.isActive ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">active</span>
        ) : (
          <span className="rounded-full bg-raised px-2 py-0.5 text-xs text-ink-faint">retired</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        <span className="inline-flex items-center gap-1">
          <button
            onClick={() => setOpen(true)}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors hover:bg-raised"
          >
            Edit
          </button>
          {/* Retire, never delete — purchase orders reference suppliers forever.
              This only removes it from the New Purchase dropdown. */}
          <button
            disabled={togglePending}
            onClick={() =>
              startToggle(async () => {
                await toggleSupplierAction(supplier.id, !supplier.isActive);
              })
            }
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              supplier.isActive
                ? "bg-red-50 text-red-700 hover:bg-red-100"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            {togglePending ? "…" : supplier.isActive ? "Retire" : "Reactivate"}
          </button>
        </span>
      </td>
    </tr>
  );
}

function Field({
  name,
  label,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        name={name}
        required={label.includes("*")}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-500"
      />
    </label>
  );
}
