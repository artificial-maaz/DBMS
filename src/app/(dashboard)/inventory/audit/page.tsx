import Link from "next/link";
import { redirect } from "next/navigation";
import { seesAllBranches } from "@/modules/inventory/permissions";
import { listActiveBranches } from "@/modules/inventory/queries";
import { requireStaff } from "@/lib/session";
import { StockAuditForm } from "./audit-form";

export default async function StockAuditPage() {
  const { profile } = await requireStaff();
  if (!["creator", "owner", "branch_manager"].includes(profile.role)) redirect("/inventory");

  const branches = await listActiveBranches();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Physical Stock Audit Reconciliation</h1>
        <Link href="/inventory" className="text-sm text-slate-500 hover:text-slate-800">← Back to Inventory</Link>
      </div>
      <StockAuditForm
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        fixedBranchId={seesAllBranches(profile.role) ? null : profile.branchId}
      />
    </div>
  );
}
