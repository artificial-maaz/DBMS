import { and, asc, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, notificationState, user } from "@/db/schema";
import { sendEmail, type EmailResult } from "@/lib/email";
import { emailsByRoles } from "./email";

/**
 * BATCHED DIGEST (Sir, 2026-08-01) — the free-tier guard.
 *
 * Emailing every staff action instantly does not scale: 4 branches x ~10
 * approvals a day x 4 recipients is ~160 emails/day, over Resend's 100/day
 * free cap and ~4,800/month against a 3,000 allowance. So high-VOLUME events
 * are collected here and delivered as ONE email per run instead.
 *
 * Rare-but-urgent events (staff added/removed, settings changed, a refund)
 * stay instant — see HIGH_PRIORITY_ACTIONS in ./email.ts.
 *
 * Like the in-app bell, this derives from the audit log — no second event
 * pipeline to keep in sync. The "how far have we reported" watermark reuses
 * notification_state under a reserved key, so this needs NO migration.
 */
const DIGEST_WATERMARK_KEY = "__email_digest__";

/** High-volume events worth knowing about, but not worth an email each. */
export const DIGEST_ACTIONS = [
  "approval.submit",
  "delivery.create",
  "sale.create",
  "installment.payment",
  "booking.create",
  "gatepass.issue",
  "inventory.stock_audit",
] as const;

const LABELS: Record<string, string> = {
  "approval.submit": "Awaiting your approval",
  "delivery.create": "Stock deliveries booked in",
  "sale.create": "Sales invoiced",
  "installment.payment": "Installment payments collected",
  "booking.create": "Advance bookings taken",
  "gatepass.issue": "Gate passes issued",
  "inventory.stock_audit": "Stock audits submitted",
};

async function watermark() {
  const row = await db.query.notificationState.findFirst({
    where: (n, { eq }) => eq(n.userId, DIGEST_WATERMARK_KEY),
  });
  // First ever run: look back 24h rather than dumping the entire history.
  return row?.lastSeenAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000);
}

async function setWatermark(at: Date) {
  await db
    .insert(notificationState)
    .values({ userId: DIGEST_WATERMARK_KEY, lastSeenAt: at })
    .onConflictDoUpdate({ target: notificationState.userId, set: { lastSeenAt: at } });
}

/**
 * Collect everything since the last run and send a single summary.
 * Sends nothing when there is nothing to report — an empty inbox beats noise,
 * and it costs no quota.
 */
export async function sendActivityDigest(opts: { dryRun?: boolean } = {}): Promise<EmailResult & { items: number }> {
  const since = await watermark();
  const now = new Date();

  const rows = await db
    .select({
      action: auditLog.action,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      details: auditLog.details,
      createdAt: auditLog.createdAt,
      actorName: user.name,
    })
    .from(auditLog)
    .innerJoin(user, eq(auditLog.userId, user.id))
    .where(and(gt(auditLog.createdAt, since), inArray(auditLog.action, [...DIGEST_ACTIONS])))
    .orderBy(asc(auditLog.createdAt));

  if (rows.length === 0) {
    if (!opts.dryRun) await setWatermark(now);
    return { sent: false, error: "Nothing new since the last digest — no email sent.", items: 0 };
  }

  // Group by action so the email reads as a summary, not a wall of events.
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = groups.get(r.action) ?? [];
    list.push(r);
    groups.set(r.action, list);
  }

  const pendingCount = groups.get("approval.submit")?.length ?? 0;

  const sections = [...groups.entries()]
    .map(([action, list]) => {
      const lines = list
        .slice(0, 15)
        .map(
          (r) =>
            `<li style="margin:3px 0">${r.actorName} &middot; ${r.entity} #${r.entityId}
             <span style="color:#94a3b8">${new Date(r.createdAt).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "short", timeStyle: "short" })}</span></li>`,
        )
        .join("");
      const more = list.length > 15 ? `<li style="color:#94a3b8">…and ${list.length - 15} more</li>` : "";
      return `<h3 style="margin:16px 0 4px;font-size:14px">${LABELS[action] ?? action}
                <span style="background:#e2e8f0;border-radius:10px;padding:1px 8px;font-size:12px">${list.length}</span>
              </h3>
              <ul style="margin:0;padding-left:18px;font-size:13px;color:#334155">${lines}${more}</ul>`;
    })
    .join("");

  const to = await emailsByRoles(["creator", "owner"]);
  const result = await sendEmail({
    to,
    subject: `[Hussain Motors] Activity digest — ${rows.length} events${pendingCount ? `, ${pendingCount} awaiting approval` : ""}`,
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#0f172a">
      <h2 style="margin:0 0 4px">Activity Digest</h2>
      <p style="margin:0 0 8px;color:#64748b;font-size:12px">
        ${new Date(since).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })} &rarr; ${now.toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}
      </p>
      ${pendingCount ? `<p style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px 12px"><b>${pendingCount}</b> item${pendingCount === 1 ? "" : "s"} waiting in your Review Queue.</p>` : ""}
      ${sections}
      <p style="color:#64748b;font-size:12px;margin-top:16px">Open the ERP to review. Generated automatically by Hussain Motors ERP.</p>
    </div>`,
  });

  // Only advance the watermark on success, so a failed send is retried next
  // run rather than silently swallowing a batch of events.
  if (result.sent && !opts.dryRun) await setWatermark(now);
  return { ...result, items: rows.length };
}
