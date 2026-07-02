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

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Hussain Motors ERP <onboarding@resend.dev>",
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
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
    return { sent: false, error: `Resend refused it (HTTP ${res.status}): ${detail}` };
  } catch (e) {
    return { sent: false, error: `Could not reach Resend: ${e instanceof Error ? e.message : String(e)}` };
  }
}
