"use server";

import { revalidatePath } from "next/cache";
import { updateSettings } from "@/modules/settings/service";
import { requireStaff } from "@/lib/session";

export type ActionState = { ok: boolean; error?: string } | null;

const MAX_LOGO_BYTES = 200 * 1024;

export async function sendTestReportAction(kind: "daily" | "monthly" | "digest"): Promise<ActionState> {
  const { profile } = await requireStaff();
  if (profile.role !== "creator") return { ok: false, error: "Creator only." };

  if (kind === "digest") {
    const { sendActivityDigest } = await import("@/modules/notifications/digest");
    const d = await sendActivityDigest();
    return d.sent ? { ok: true } : { ok: false, error: d.error ?? "Not sent." };
  }

  const { sendDailyReport, sendMonthlyReport } = await import("@/modules/reports/email-reports");
  const result = kind === "daily" ? await sendDailyReport() : await sendMonthlyReport();
  // Show the REAL reason (2026-08-01) — a generic "is the key set?" message sent
  // us hunting for a key that was already there.
  return result.sent ? { ok: true } : { ok: false, error: result.error ?? "Not sent (no reason reported)." };
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
