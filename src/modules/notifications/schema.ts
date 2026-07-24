import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * #27: per-user "notifications last seen" watermark. Notifications themselves
 * are DERIVED from the audit log (single source of truth, nothing to keep in
 * sync) — this table only remembers how far each user has read.
 */
export const notificationState = pgTable("notification_state", {
  userId: text("user_id").primaryKey(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
});
