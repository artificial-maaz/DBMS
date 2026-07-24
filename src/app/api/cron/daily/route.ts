import { NextRequest, NextResponse } from "next/server";
import { sendDailyReport } from "@/modules/reports/email-reports";

/** Hit by an external scheduler (cron-job.org) every evening. Secret-protected. */
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await sendDailyReport();
  return NextResponse.json({ ok: true, sent: result.sent });
}
