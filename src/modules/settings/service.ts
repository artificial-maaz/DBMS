import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { APP_NAME, APP_SHORT_NAME, COMPANY_NAME } from "@/lib/config";
import { DEFAULT_BRAND } from "@/lib/theme";
import { moneyZero } from "@/lib/validation";

type Actor = { userId: string; role: string };

export const canManageSettings = (role: string) => role === "creator";

const DEFAULTS = {
  id: 1,
  companyName: COMPANY_NAME,
  shortName: APP_SHORT_NAME,
  browserTitle: APP_NAME,
  themeColor: DEFAULT_BRAND, // GUI phase: indigo, not near-black
  logoDataUrl: null as string | null,
  defaultCommissionRate: "0",
  defaultExciseFee: "0",
  defaultShowroomProfit: "0",
  warrantyDays: 365,
  timezone: "Asia/Karachi",
};

/** Read the singleton; create it from config.ts defaults on first boot. */
export async function getSettings() {
  const row = await db.query.systemSettings.findFirst({ where: (s, { eq }) => eq(s.id, 1) });
  if (row) return row;
  const [created] = await db.insert(systemSettings).values(DEFAULTS).onConflictDoNothing().returning();
  return created ?? { ...DEFAULTS, updatedAt: new Date() };
}

const settingsSchema = z.object({
  companyName: z.string().trim().min(2, "Company name required").max(120),
  shortName: z.string().trim().min(1).max(30),
  browserTitle: z.string().trim().min(2).max(120),
  themeColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Theme color must be a hex code like #6366F1"),
  defaultCommissionRate: moneyZero.refine((v) => Number(v) <= 100, "Rate is a percentage (0–100)"),
  defaultExciseFee: moneyZero,
  defaultShowroomProfit: moneyZero,
  warrantyDays: z.coerce.number().int().min(0).max(3650),
  timezone: z.string().trim().min(3).max(60),
});

export async function updateSettings(actor: Actor, raw: unknown, logoDataUrl?: string | null) {
  if (!canManageSettings(actor.role)) {
    return { ok: false as const, error: "Only the Creator can change system settings." };
  }
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const i = parsed.data;

  await getSettings(); // ensure the singleton exists before updating
  await db
    .update(systemSettings)
    .set({
      companyName: i.companyName,
      shortName: i.shortName,
      browserTitle: i.browserTitle,
      themeColor: i.themeColor,
      defaultCommissionRate: i.defaultCommissionRate,
      defaultExciseFee: i.defaultExciseFee,
      defaultShowroomProfit: i.defaultShowroomProfit,
      warrantyDays: i.warrantyDays,
      timezone: i.timezone,
      ...(logoDataUrl !== undefined ? { logoDataUrl } : {}),
      updatedAt: new Date(),
    })
    .where(eq(systemSettings.id, 1));

  await writeAudit({
    userId: actor.userId,
    action: "settings.update",
    entity: "system_settings",
    entityId: 1,
    details: { companyName: i.companyName, themeColor: i.themeColor, logoChanged: logoDataUrl !== undefined },
  });
  return { ok: true as const };
}
