import { NextRequest, NextResponse } from "next/server";
import { sendMonthlyReport } from "@/modules/reports/email-reports";

/** Hit on the 1st of each month — reports on the PREVIOUS month. */
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const result = await sendMonthlyReport(prev.getFullYear(), prev.getMonth() + 1);
  return NextResponse.json({ ok: true, sent: result.sent });
}
