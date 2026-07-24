import { boolean, integer, numeric, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { branches } from "../branches/schema";

/**
 * RBAC roles. Order matters conceptually (privilege descends), but enforcement
 * lives in each module's permissions.ts — never in the UI.
 * Extensible: append new values via migration.
 */
export const staffRole = pgEnum("staff_role", [
  "creator",
  "owner",
  "silent_partner", // Sir #3 (2026-07-15): investor — read-only visibility, no management powers
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
  cnic: varchar("cnic", { length: 15 }), // #24
  basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }).notNull().default("0"),
  monthlyAllowances: numeric("monthly_allowances", { precision: 12, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});
