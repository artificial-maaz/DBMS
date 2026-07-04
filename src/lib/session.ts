import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth/auth";
import { db } from "@/db";

/**
 * Server-side session + staff profile in one call.
 * EVERY protected page/action goes through requireStaff() — the UI is never
 * trusted (Code Standards rule). Deactivated staff are cut off here too.
 */
export async function getSessionWithProfile() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const profile = await db.query.staffProfiles.findFirst({
    where: (p, { eq }) => eq(p.userId, session.user.id),
  });
  return { session, profile: profile ?? null };
}

export type Staff = NonNullable<Awaited<ReturnType<typeof requireStaff>>>;

export async function requireStaff() {
  const s = await getSessionWithProfile();
  if (!s || !s.profile || !s.profile.isActive) redirect("/login");
  return { user: s.session.user, profile: s.profile };
}

/** Financial visibility: Creator + Owners only (P&L / revenue / purchase prices). */
export function canSeeFinancials(role: string) {
  return role === "creator" || role === "owner";
}
