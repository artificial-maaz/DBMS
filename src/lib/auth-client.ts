"use client";

import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [organizationClient()],
});

export const { signIn, signOut, useSession, resetPassword } = authClient;

/**
 * Better Auth renamed `forgetPassword` to `requestPasswordReset`. This build
 * ships both (the old name is a thin alias), but only the new one is on the
 * client type — so destructuring the old name fails to compile even though it
 * works at runtime. Export the current name and let the type follow it.
 */
export const requestPasswordReset = authClient.requestPasswordReset;
