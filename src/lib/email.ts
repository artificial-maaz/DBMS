/**
 * Email via Resend's REST API (no SDK dependency).
 *
 * Setup: free account at resend.com -> API key -> RESEND_API_KEY in .env +
 * Railway Variables. UNTIL a domain is verified there, Resend only delivers
 * to the account owner's own address (Sir) — owner/partner addresses start
 * working the moment a domain is verified. Missing key = silent no-op, so
 * the app never breaks because email isn't configured.
 *
 * 2026-08-01: this used to swallow every failure into a bare `sent: false`,
 * which made "Not sent" impossible to diagnose. It now returns the real
 * reason, including Resend's own error text. It still NEVER throws — email
 * must not break a business transaction.
 */
export type EmailResult = { sent: boolean; error?: string };

/**
 * Until a domain is verified, Resend's shared sender may only deliver to the
 * account owner's own address — and it rejects the ENTIRE send if even one
 * recipient is someone else. So while unverified, set RESEND_ONLY_TO to your
 * own address: every email is redirected there, with a banner naming who it
 * was really meant for. Delete that variable the day a domain is verified and
 * real recipients start receiving automatically, no code change.
 */
export async function sendEmail(opts: { to: string[]; subject: string; html: string }): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return {
      sent: false,
      error:
        "RESEND_API_KEY is not visible to the server. Add it to .env and FULLY restart the dev server — env vars are only read at startup.",
    };
  }
  if (opts.to.length === 0) {
    return { sent: false, error: "No recipients — no active creator/owner account has an email address on it." };
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

    // Resend replies with JSON like { statusCode, name, message }. Surface it
    // verbatim — its messages are genuinely useful (unverified domain, bad key,
    // recipient not allowed while still on the shared sender, etc).
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
        ? " — FIX: add RESEND_ONLY_TO=your@email.com to .env (and Railway Variables) and restart, so every email is redirected to you until a domain is verified."
        : "";
    return { sent: false, error: `Resend refused it (HTTP ${res.status}): ${detail}${hint}` };
  } catch (e) {
    return { sent: false, error: `Could not reach Resend: ${e instanceof Error ? e.message : String(e)}` };
  }
}
