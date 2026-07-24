/**
 * Email via Resend's REST API (no SDK dependency).
 * Setup: free account at resend.com -> API key -> RESEND_API_KEY in .env +
 * Railway Variables. UNTIL a domain is verified there, Resend only delivers
 * to the account owner's own address (Sir) — owner/partner addresses start
 * working the moment a domain is verified. Missing key = silent no-op, so
 * the app never breaks because email isn't configured.
 */
export async function sendEmail(opts: { to: string[]; subject: string; html: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key || opts.to.length === 0) return { sent: false as const };

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
    return { sent: res.ok as boolean };
  } catch {
    return { sent: false as const }; // email must never break a business transaction
  }
}
