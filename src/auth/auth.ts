import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "@/db";

/**
 * Better Auth, self-hosted in our Postgres.
 * - emailAndPassword: staff log in with email + password.
 * - organization plugin: invites, members, roles, revocation — maps to our
 *   Creator/Owner/Employee model. Domain-level role + branch scope lives in
 *   staff_profiles; auth roles gate the door, permissions.ts gates the rooms.
 * - Public sign-up is DISABLED: accounts exist only via invite (RBAC rule).
 *
 * After changing plugins run: npm run auth:generate  (regenerates auth-schema.ts)
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // invite-only onboarding
  },
  plugins: [organization()],
});
