import { boolean, integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { branches } from "../branches/schema";

/**
 * RBAC roles. Order matters conceptually (privilege descends), but enforcement
 * lives in each module's permissions.ts — never in the UI.
 * Extensible: append new values via migration.
 */
export const staffRole = pgEnum("staff_role", [
  "creator",
  "owner",
  "branch_manager",
  "salesperson",
  "mechanic",
  "gate_staff",
]);

/**
 * Staff profile — extends a Better Auth user (userId → auth "user" table,
 * FK added after `npm run auth:generate` creates src/db/auth-schema.ts).
 * Creator/Owners have branchId = null (all-branch scope).
 * Deactivation = isActive false + session revocation; history is retained.
 */
export const staffProfiles = pgTable("staff_profiles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id").notNull().unique(),
  role: staffRole("role").notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  designation: text("designation"),
  isActive: boolean("is_active").notNull().default(true),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});
