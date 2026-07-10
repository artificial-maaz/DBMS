"use client";

import { useActionState } from "react";
import { updateSettingsAction, type ActionState } from "./actions";

type Settings = {
  companyName: string;
  shortName: string;
  browserTitle: string;
  themeColor: string;
  logoDataUrl: string | null;
  defaultCommissionRate: string;
  defaultExciseFee: string;
  defaultShowroomProfit: string;
  warrantyDays: number;
  timezone: string;
};

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateSettingsAction, null);

  return (
    <form action={formAction} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Brand Identity</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field name="companyName" label="Company / Showroom Name *" defaultValue={settings.companyName} />
          <Field name="shortName" label="Short Name (PWA icon label) *" defaultValue={settings.shortName} />
          <Field name="browserTitle" label="Browser Tab Title *" defaultValue={settings.browserTitle} />

          <label className="text-sm">
            <span className="mb-1 block font-medium">Theme Color *</span>
            <span className="flex items-center gap-2">
              <input
                type="color"
                defaultValue={settings.themeColor}
                onChange={(e) => {
                  const hex = e.currentTarget.form?.elements.namedItem("themeColor") as HTMLInputElement | null;
                  if (hex) hex.value = e.currentTarget.value;
                }}
                className="h-9 w-12 cursor-pointer rounded border border-slate-300"
              />
              <input
                name="themeColor"
                defaultValue={settings.themeColor}
                className="w-28 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </span>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Company Logo</span>
            <input
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-sm"
            />
            <span className="mt-1 block text-xs text-slate-400">PNG/JPG/SVG/WebP, max 200 KB. Replaces the ⚡ everywhere.</span>
          </label>

          {settings.logoDataUrl && (
            <label className="flex items-end gap-3 text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={settings.logoDataUrl} alt="Current logo" className="h-10 w-10 rounded object-contain ring-1 ring-slate-200" />
              <span className="inline-flex items-center gap-1.5 pb-2">
                <input type="checkbox" name="removeLogo" />
                Remove current logo
              </span>
            </label>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Sales Defaults</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            name="defaultCommissionRate"
            label="Salesperson Commission Rate (%)"
            defaultValue={settings.defaultCommissionRate}
            hint="Suggested commission = rate × sale price (editable per sale)"
          />
          <Field
            name="defaultExciseFee"
            label="Default Excise Fee (Rs.)"
            defaultValue={settings.defaultExciseFee}
            hint="Pre-fills the govt portion of the registration fee"
          />
          <Field
            name="defaultShowroomProfit"
            label="Default Showroom Profit (Rs.)"
            defaultValue={settings.defaultShowroomProfit}
            hint="Pre-fills the showroom portion of the registration fee"
          />
          <Field name="warrantyDays" label="Warranty Duration (days)" defaultValue={String(settings.warrantyDays)} hint="e.g. 365 for 1 year" />
          <Field name="timezone" label="Global Timezone" defaultValue={settings.timezone} hint="e.g. Asia/Karachi" />
        </div>
      </section>

      {state && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-600">✔ Settings saved — branding updates everywhere.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Configuration"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  defaultValue: string;
  hint?: string;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        name={name}
        required={label.includes("*")}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
      />
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}
