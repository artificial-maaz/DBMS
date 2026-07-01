import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { staffProfiles, user } from "@/db/schema";
import { sendEmail } from "@/lib/email";

/**
 * Recipient policy (Sir, 2026-07-15):
 *  - HIGH priority instants -> Creator + Owners
 *  - DAILY report           -> Creator + Owners
 *  - MONTHLY report         -> Creator + Owners; Silent Partners get a
 *                              limited summary variant (separate send)
 *  - everything else        -> Creator only (in-app bell covers the rest)
 */
export async function emailsByRoles(roles: string[]) {
  const rows = await db
    .select({ email: user.email })
    .from(staffProfiles)
    .innerJoin(user, eq(staffProfiles.userId, user.id))
    .where(inArray(staffProfiles.role, roles as never[]));
  return rows.map((r) => r.email).filter(Boolean);
}

/** Fired from writeAudit for HIGH_PRIORITY actions — fire-and-forget. */
export const HIGH_PRIORITY_ACTIONS = new Set([
  "approval.submit",
  "staff.create",
  "staff.deactivate",
  "settings.update",
  "booking.refund",
  // Sir #4 (2026-07-31): stock physically arriving is a money event — owners
  // should hear about a consignment the moment it is booked in, not at month end.
  "delivery.create",
]);

export async function sendHighPriorityEmail(action: string, actorName: string, details: unknown) {
  const to = await emailsByRoles(["creator", "owner"]);
  const pretty = action.replace(/\./g, " → ");
  await sendEmail({
    to,
    subject: `[Hussain Motors ERP] ${pretty}`,
    html: `<div style="font-family:Arial,sans-serif;font-size:14px">
      <h2 style="margin:0 0 8px">${pretty}</h2>
      <p><b>${actorName}</b> triggered this just now.</p>
      <pre style="background:#f1f5f9;padding:12px;border-radius:8px;font-size:12px">${
        details ? JSON.stringify(details, null, 2) : ""
      }</pre>
      <p style="color:#64748b;font-size:12px">Full detail in the ERP → Audit Log / Review Queue.</p>
    </div>`,
  });
}
