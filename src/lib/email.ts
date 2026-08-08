import nodemailer from "nodemailer";

/**
 * Email delivery, with two transports.
 *
 * ---------------------------------------------------------------------------
 * WHY TWO (Sir, 2026-08-15)
 * ---------------------------------------------------------------------------
 * Resend (the original transport) refuses to deliver to ANY address except the
 * account owner's until a domain is verified with DNS records. Hussain Motors
 * has no domain yet, so owners were on every notification list and receiving
 * nothing — the `RESEND_ONLY_TO` redirect existed purely to stop the whole send
 * being rejected.
 *
 * SMTP has no such restriction, because we are not asking a third party to send
 * "as" us — we are logging into a mailbox we already own
 * (yadeahussainautos@gmail.com) and sending from it, exactly as a person would.
 * Gmail allows ~500 recipients/day; this system is projected at ~100 a MONTH.
 *
 * SMTP is preferred when configured. Resend stays wired and becomes the better
 * choice later, once a domain exists — better deliverability at volume, proper
 * logs and retries. Nothing needs rewriting to switch: unset the SMTP vars.
 *
 * ---------------------------------------------------------------------------
 * SETUP (Gmail)
 * ---------------------------------------------------------------------------
 *   1. Turn on 2-Step Verification on the Google account.
 *   2. Google Account → Security → App passwords → generate one, name it
 *      "Hussain Motors ERP". It is 16 characters; spaces are ignored.
 *   3. Put these in .env AND Railway Variables:
 *        SMTP_USER=yadeahussainautos@gmail.com
 *        SMTP_PASS=<the 16-character app password>
 *        SMTP_FROM=Yadea Hussain Motors <yadeahussainautos@gmail.com>
 *        MAIL_ALWAYS_CC=yadeahussainautos@gmail.com
 *   4. Restart. Env vars are read at startup only.
 *
 * An app password is NOT the account password. It only permits sending, it can
 * be revoked from the same screen at any time, and revoking it does not touch
 * the mailbox or anyone's access to it.
 *
 * This function NEVER throws — a failed email must not roll back a sale.
 */
export type EmailResult = { sent: boolean; error?: string };

/** Cached between invocations; creating a transport per email is wasteful. */
let transport: nodemailer.Transporter | null = null;

/**
 * PORT MATTERS MORE THAN IT SHOULD (Sir, 2026-08-16).
 *
 * Mail sent fine from Sir's laptop and timed out from Railway. Cloud hosts
 * commonly block or throttle outbound SMTP to stop spam, and port 465 (implicit
 * TLS) is the usual casualty; 587 (STARTTLS) is far more often left open.
 *
 * So: default to 587, not 465. `secure` is derived from the port because
 * setting it wrong hangs until timeout rather than failing clearly - 465 speaks
 * TLS immediately, 587 starts in plaintext and upgrades. `requireTLS` makes the
 * upgrade mandatory, so a downgrade cannot silently send credentials in clear.
 *
 * The timeouts are deliberately short. Default is two minutes, during which the
 * request just hangs; ten seconds fails fast with a message worth reading.
 */
function smtpTransport() {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s/g, ""); // Google prints it in groups of four
  if (!user || !pass) return null;

  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = port === 465;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
      port,
      secure,
      requireTLS: !secure,
      auth: { user, pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return transport;
}

/**
 * The official company mailbox, added to every send.
 *
 * Sir's reasoning (2026-08-15): every owner is already signed into that account
 * on their own device, so one address reaches all of them without maintaining a
 * list of personal emails — and without a personal address leaking into a
 * system an owner might one day leave.
 */
function withStandingRecipient(to: string[]): string[] {
  const always = process.env.MAIL_ALWAYS_CC?.trim();
  const all = always ? [...to, always] : to;
  return [...new Set(all.map((a) => a.trim().toLowerCase()).filter(Boolean))];
}

export async function sendEmail(opts: { to: string[]; subject: string; html: string }): Promise<EmailResult> {
  const recipients = withStandingRecipient(opts.to);
  if (recipients.length === 0) {
    return { sent: false, error: "No recipients — no active creator/owner account has an email address on it." };
  }

  const smtp = smtpTransport();
  if (smtp) {
    try {
      await smtp.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: recipients.join(", "),
        subject: opts.subject,
        html: opts.html,
      });
      return { sent: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);

      /**
       * A timeout here almost always means the HOST blocks the port, not that
       * anything is wrong with the credentials — the identical config works
       * from a laptop. Falling through to Resend keeps the Creator informed
       * even when the company mailbox is unreachable, which is strictly better
       * than the whole notification system going quiet.
       */
      if (/timed? ?out|ETIMEDOUT|ECONNREFUSED|ESOCKET|EDNS/i.test(msg)) {
        console.error(
          `[email] SMTP unreachable on port ${process.env.SMTP_PORT || 587} (${msg}). ` +
            `If this is a cloud host, try SMTP_PORT=587. Falling back to Resend.`,
        );
        const fallback = await sendViaResend({ ...opts, to: recipients });
        return fallback.sent
          ? fallback
          : { sent: false, error: `SMTP unreachable (${msg}); Resend fallback also failed: ${fallback.error}` };
      }

      const hint = /invalid login|username and password not accepted|BadCredentials/i.test(msg)
        ? " — FIX: SMTP_PASS must be a Google APP PASSWORD (2-Step Verification on, then Security → App passwords), not the account password."
        : "";
      return { sent: false, error: `SMTP refused it: ${msg}${hint}` };
    }
  }

  return sendViaResend({ ...opts, to: recipients });
}

/**
 * Resend fallback. Kept intact for the day a domain is verified.
 *
 * While unverified, Resend rejects the ENTIRE send if any recipient is not the
 * account owner — hence RESEND_ONLY_TO, which redirects everything to one
 * address with a banner naming who it was really for. Delete that variable the
 * day a domain is verified and real recipients start working with no code change.
 */
async function sendViaResend(opts: { to: string[]; subject: string; html: string }): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return {
      sent: false,
      error:
        "No mail transport configured. Set SMTP_USER + SMTP_PASS (recommended), or RESEND_API_KEY, in .env and FULLY restart — env vars are read at startup.",
    };
  }

  const override = process.env.RESEND_ONLY_TO?.trim();
  const recipients = override ? [override] : opts.to;
  const redirected = Boolean(override) && !(opts.to.length === 1 && opts.to[0] === override);
  const banner = redirected
    ? `<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px 12px;margin-bottom:14px;font-family:Arial,sans-serif;font-size:12px;color:#92400e">
         <b>Test mode.</b> Intended recipients: ${opts.to.join(", ")}. Delivered only to you because no domain
         is verified on Resend yet.
       </div>`
    : "";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "Hussain Motors ERP <onboarding@resend.dev>",
        to: recipients,
        subject: opts.subject,
        html: banner + opts.html,
      }),
    });

    if (res.ok) return { sent: true };

    const body = await res.text();
    let detail = body;
    try {
      const parsed = JSON.parse(body) as { message?: string; name?: string };
      detail = parsed.message ?? parsed.name ?? body;
    } catch {
      /* keep the raw body */
    }
    const hint =
      res.status === 403 && !override
        ? " — FIX: configure SMTP instead (SMTP_USER + SMTP_PASS), or add RESEND_ONLY_TO=your@email.com until a domain is verified."
        : "";
    return { sent: false, error: `Resend refused it (HTTP ${res.status}): ${detail}${hint}` };
  } catch (e) {
    return { sent: false, error: `Could not reach Resend: ${e instanceof Error ? e.message : String(e)}` };
  }
}
