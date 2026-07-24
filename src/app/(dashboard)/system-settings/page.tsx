import { redirect } from "next/navigation";
import { canManageSettings, getSettings } from "@/modules/settings/service";
import { requireStaff } from "@/lib/session";
import { SettingsForm } from "./settings-form";
import { TestReports } from "./test-reports";

export default async function SystemSettingsPage() {
  const { profile } = await requireStaff();
  if (!canManageSettings(profile.role)) redirect("/dashboard");

  const s = await getSettings();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">System Settings & Branding</h1>
        <p className="mt-1 text-sm text-slate-500">
          Creator-only. Changes apply system-wide: sidebar, browser tab, PWA name, and sale-form defaults.
        </p>
      </div>
      <SettingsForm
        settings={{
          companyName: s.companyName,
          shortName: s.shortName,
          browserTitle: s.browserTitle,
          themeColor: s.themeColor,
          logoDataUrl: s.logoDataUrl,
          defaultCommissionRate: s.defaultCommissionRate,
          defaultExciseFee: s.defaultExciseFee,
          defaultShowroomProfit: s.defaultShowroomProfit,
          warrantyDays: s.warrantyDays,
          timezone: s.timezone,
        }}
      />
      <TestReports />
    </div>
  );
}
