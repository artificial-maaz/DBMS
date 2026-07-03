import { integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * System-wide audit log (day-one requirement): who, what, when, where.
 * Written automatically by the mutation wrapper in src/lib/audit.ts (next chunk)
 * — modules never log manually, so nothing can be forgotten.
 * Append-only, retained forever, survives user deactivation.
 */
export const auditLog = pgTable("audit_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id").notNull(),
  action: varchar("action", { length: 60 }).notNull(),      // e.g. invoice.create
  entity: varchar("entity", { length: 60 }).notNull(),      // e.g. invoice
  entityId: varchar("entity_id", { length: 40 }).notNull(),
  branchId: integer("branch_id"),
  details: jsonb("details"),                                 // diff/payload snapshot
  ip: varchar("ip", { length: 45 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
