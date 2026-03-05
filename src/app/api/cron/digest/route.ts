import { NextRequest, NextResponse } from "next/server";
import { sendActivityDigest } from "@/modules/notifications/digest";

/**
 * Batched activity digest — hit by cron-job.org a few times a day (e.g. 13:00
 * and 20:00 PKT). One email per run instead of one per staff action, which is
 * what keeps us inside Resend's free tier. Secret-protected.
 */
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await sendActivityDigest();
  return NextResponse.json({ ok: true, sent: result.sent, items: result.items, error: result.error });
}
