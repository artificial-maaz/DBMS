import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "@/db";
import { sendEmail } from "@/lib/email";
import { APP_NAME } from "@/lib/config";

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

    /**
     * Self-service password reset (Sir, 2026-08-16).
     *
     * This was PARKED in chunk 39 for one reason only: no mail transport could
     * reach a staff member's inbox, so a reset link would have gone nowhere and
     * a dead "Forgot password?" is worse than none. SMTP fixed that tonight, so
     * the feature is now honest to offer.
     *
     * Why it matters more than it looks: every lockout currently routes through
     * Sir personally, in person, including on a Sunday. That does not scale past
     * one branch — and it is the single thing most likely to make a manager
     * abandon the system on a bad morning.
     *
     * The Creator-set temporary password stays as well. It is the right tool
     * when someone has lost access to their email too.
     */
    sendResetPassword: async ({ user, url }) => {
      // Better Auth may run this in the background, so a throw here would
      // vanish. Log the outcome either way - a reset that silently fails to
      // send is indistinguishable from one that was never requested, and that
      // is exactly the situation that wastes an evening.
      const result = await sendEmail({
        to: [user.email],
        subject: `${APP_NAME} — reset your password`,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#0f172a">
          <h2 style="margin:0 0 10px">Reset your password</h2>
          <p>Hello ${user.name || "there"},</p>
          <p>Someone asked to reset the password for this account. Click below to choose a new one:</p>
          <p style="margin:22px 0">
            <a href="${url}" style="background:#1b3168;color:#fff;padding:11px 20px;border-radius:8px;
               text-decoration:none;font-weight:600;display:inline-block">Set a new password</a>
          </p>
          <p style="color:#4b5568;font-size:12px">
            This link expires in one hour and can be used once.<br />
            <b>If you did not request this, ignore this email</b> — your password has not changed.
          </p>
        </div>`,
      });

      if (result.sent) {
        console.log(`[auth] reset link emailed to ${user.email}`);
      } else {
        console.error(`[auth] RESET EMAIL FAILED for ${user.email}: ${result.error}`);
      }
    },
    resetPasswordTokenExpiresIn: 3600, // one hour is plenty, and limits a leaked link
  },
  plugins: [organization()],
});
