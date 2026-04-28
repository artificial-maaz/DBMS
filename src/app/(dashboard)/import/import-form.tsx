"use client";

import { useActionState, useState } from "react";
import { importCsvAction, type ImportState } from "./actions";

type Tpl = { headers: string; example: string };

const TYPE_LABELS: Record<string, string> = {
  vehicles: "Vehicles (inventory)",
  customers: "Customers",
  visitors: "Visitors / Leads",
};

export function ImportForm({ templates }: { templates: Record<string, Tpl> }) {
  const [type, setType] = useState("vehicles");
  const [state, formAction, pending] = useActionState<ImportState, FormData>(importCsvAction, null);

  const tpl = templates[type];
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(tpl.headers + "\n" + tpl.example + "\n")}`;

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4 card p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium">What are you importing? *</span>
            <select
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2"
            >
              {Object.entries(TYPE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </label>

          {/* #20: NO Tailwind `file:` utilities on this input. They outrank the
              unprefixed rule in globals.css, and `file:border-0` in particular
              stripped the button's border in light mode. The file button is
              styled once, in globals.css, for both themes. */}
          <label className="text-sm">
            <span className="mb-1 block font-medium">CSV File *</span>
            <input
              type="file"
              name="file"
              accept=".csv,text/csv"
              required
              className="w-full rounded-lg border border-line px-3 py-1.5 text-sm"
            />
          </label>
        </div>

        <div className="rounded-lg bg-raised p-4 text-sm">
          <p className="mb-1 font-medium">Expected columns for {TYPE_LABELS[type]}:</p>
          <code className="block overflow-x-auto whitespace-nowrap text-xs text-ink-soft">{tpl.headers}</code>
          <a
            href={templateHref}
            download={`${type}-template.csv`}
            className="mt-2 inline-block rounded-md bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-500"
          >
            ⬇ Download template
          </a>
          <span className="ml-3 text-xs text-ink-faint">
            Fill it in Excel, then Save As → CSV. Branch column takes the branch <em>name</em>.
          </span>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {pending ? "Validating & importing…" : "Import File"}
        </button>
      </form>

      {state?.ok && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
          ✔ <span className="font-semibold">{state.imported}</span> rows imported successfully.
        </div>
      )}

      {state && !state.ok && state.errors && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="mb-2 font-medium text-red-800">
            Nothing was imported — fix these rows and upload the same file again:
          </p>
          <ul className="max-h-64 space-y-1 overflow-y-auto text-sm text-red-700">
            {state.errors.map((e, i) => (
              <li key={i}>
                {e.row > 0 && <span className="font-mono font-medium">Row {e.row}: </span>}
                {e.error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
