import { integer, numeric, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * #29: system-wide settings — a SINGLETON row (id = 1, enforced in service).
 * Replaces the hardcoded constants in src/lib/config.ts (which remain only as
 * first-boot defaults). Creator-only writes.
 */
export const systemSettings = pgTable("system_settings", {
  id: integer("id").primaryKey(), // always 1
  companyName: varchar("company_name", { length: 120 }).notNull(),
  shortName: varchar("short_name", { length: 30 }).notNull(),
  browserTitle: varchar("browser_title", { length: 120 }).notNull(),
  themeColor: varchar("theme_color", { length: 9 }).notNull().default("#0f172a"),
  /** small image stored inline as a data: URL (max ~200KB) — no blob storage needed */
  logoDataUrl: text("logo_data_url"),
  defaultCommissionRate: numeric("default_commission_rate", { precision: 5, scale: 2 }).notNull().default("0"), // %
  defaultExciseFee: numeric("default_excise_fee", { precision: 12, scale: 2 }).notNull().default("0"),
  defaultShowroomProfit: numeric("default_showroom_profit", { precision: 12, scale: 2 }).notNull().default("0"),
  warrantyDays: integer("warranty_days").notNull().default(365),
  timezone: varchar("timezone", { length: 60 }).notNull().default("Asia/Karachi"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
