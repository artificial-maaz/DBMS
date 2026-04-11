import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { seesAllBranches } from "@/modules/inventory/permissions";
import { listActiveBranches } from "@/modules/inventory/queries";
import { requireStaff } from "@/lib/session";
import { StockAuditForm } from "./audit-form";

export default async function StockAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>;
}) {
  const { profile } = await requireStaff();
  if (!["creator", "owner", "branch_manager"].includes(profile.role)) redirect("/inventory");
  const params = await searchParams;

  const branches = await listActiveBranches();
  const all = seesAllBranches(profile.role);
  const branchId = all ? Number(params.branch) || branches[0]?.id : profile.branchId;
  const branch = branches.find((b) => b.id === branchId);

  const stock = branchId
    ? await db
        .select({ id: vehicles.id, chassisNo: vehicles.chassisNo, make: vehicles.make, model: vehicles.model, color: vehicles.color })
        .from(vehicles)
        .where(and(eq(vehicles.branchId, branchId), eq(vehicles.status, "in_stock")))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Physical Stock Audit</h1>
        <Link href="/inventory" className="text-sm text-ink-faint hover:text-slate-800">← Back to Inventory</Link>
      </div>

      {all && (
        <form method="get" className="flex gap-3">
          <select name="branch" defaultValue={String(branchId ?? "")} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm">
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-500">Load Stock</button>
        </form>
      )}

      {branch ? (
        <StockAuditForm
          branchId={branch.id}
          branchName={branch.name}
          stock={stock.map((v) => ({
            id: v.id,
            chassisNo: v.chassisNo,
            label: `${v.make} ${v.model}${v.color ? ` (${v.color})` : ""}`,
          }))}
        />
      ) : (
        <p className="text-sm text-ink-faint">No branch available.</p>
      )}
    </div>
  );
}
