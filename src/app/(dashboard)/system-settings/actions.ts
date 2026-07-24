"use server";

import { revalidatePath } from "next/cache";
import { updateSettings } from "@/modules/settings/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string } | null;

const MAX_LOGO_BYTES = 200 * 1024;

export async function sendTestReportAction(kind: "daily" | "monthly"): Promise<ActionState> {
  const { profile } = await requireStaff();
  if (profile.role !== "creator") return { ok: false, error: "Creator only." };
  const { sendDailyReport, sendMonthlyReport } = await import("@/modules/reports/email-reports");
  const result = kind === "daily" ? await sendDailyReport() : await sendMonthlyReport();
  return result.sent
    ? { ok: true }
    : { ok: false, error: "Not sent — is RESEND_API_KEY set in .env / Railway Variables?" };
}

export async function updateSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireStaff();

  // Logo: optional file → inline data URL (kept small on purpose — it ships with every page).
  let logoDataUrl: string | null | undefined = undefined;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > MAX_LOGO_BYTES) return { ok: false, error: "Logo too large — keep it under 200 KB." };
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(logo.type)) {
      return { ok: false, error: "Logo must be PNG, JPG, SVG, or WebP." };
    }
    const buf = Buffer.from(await logo.arrayBuffer());
    logoDataUrl = `data:${logo.type};base64,${buf.toString("base64")}`;
  }
  if (formData.get("removeLogo") === "on") logoDataUrl = null;

  const result = await updateSettings(
    { userId: user.id, role: profile.role },
    Object.fromEntries(formData),
    logoDataUrl,
  );
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/", "layout"); // branding shows everywhere
  return { ok: true };
}
