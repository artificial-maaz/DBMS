import { redirect } from "next/navigation";
import {
  listBranchesForFormats,
  stockLinesForBranch,
  todaysCashForBranch,
} from "@/modules/formats/queries";
import { seesAllBranches } from "@/modules/sales/permissions";
import { requireStaff } from "@/lib/session";
import type { StockLine } from "@/modules/formats/templates";
import {
  BookingBuilder,
  PartsOrderBuilder,
  StockReportBuilder,
  TransferBuilder,
} from "./format-builders";
import { TransferLetter } from "./transfer-letter";

/**
 * Formats & Messages (Sir, 2026-08-15).
 *
 * Every message a branch sends to the group, generated instead of typed. The
 * stock report in particular is read from live inventory — typed by hand at the
 * end of a long day it drifts from the system, and then nobody knows which
 * number is real.
 */
export default async function FormatsPage() {
  const { profile } = await requireStaff();
  const allowed = ["creator", "owner", "branch_manager", "salesperson", "assistant"];
  if (!allowed.includes(profile.role)) redirect("/dashboard");

  const allBranches = await listBranchesForFormats();

  // Branch managers see their own branch only; owners see all.
  const branches = seesAllBranches(profile.role)
    ? allBranches
    : allBranches.filter((b) => b.id === profile.branchId);

  const stockByBranch: Record<number, StockLine[]> = {};
  const cashByBranch: Record<number, string> = {};
  for (const b of branches) {
    stockByBranch[b.id] = await stockLinesForBranch(b.id);
    cashByBranch[b.id] = await todaysCashForBranch(b.id);
  }

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <h1 className="text-xl font-semibold">Formats &amp; Messages</h1>
        <p className="text-sm text-ink-faint">
          The messages you send to the group every day, built for you. Fill the blanks, press Copy, paste
          into WhatsApp. The bold markers are already correct.
        </p>
      </div>

      {branches.length === 0 ? (
        <p className="card px-4 py-10 text-center text-ink-faint">
          No branch assigned to your account yet.
        </p>
      ) : (
        <>
          <StockReportBuilder branches={branches} stockByBranch={stockByBranch} cashByBranch={cashByBranch} />
          <BookingBuilder />
          <PartsOrderBuilder />
          <TransferBuilder branches={allBranches} />
          <TransferLetter />
        </>
      )}
    </div>
  );
}
