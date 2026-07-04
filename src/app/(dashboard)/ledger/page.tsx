import { redirect } from "next/navigation";
import { canRecordEntry, canViewLedger, seesAllBranches } from "@/modules/ledger/permissions";
import { listEntries } from "@/modules/ledger/queries";
import { LEDGER_CATEGORIES } from "@/modules/ledger/validators";
import { listActiveBranches } from "@/modules/inventory/queries";
import { requireStaff } from "@/lib/session";
import { AddEntryForm } from "./add-entry-form";

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string; category?: string; branch?: string; from?: string; to?: string }>;
}) {
  const { profile } = await requireStaff();
  if (!canViewLedger(profile.role)) redirect("/dashboard");
  const params = await searchParams;
  const allBranches = seesAllBranches(profile.role);

  const [{ rows, totalIn, totalOut }, branches] = await Promise.all([
    listEntries({
      role: profile.role,
      ownBranchId: profile.branchId,
      direction: params.direction,
      category: params.category,
      branchId: params.branch ? Number(params.branch) : undefined,
      from: params.from,
      to: params.to,
    }),
    listActiveBranches(),
  ]);

  const fmt = (v: string) => `Rs. ${Number(v).toLocaleString("en-PK")}`;
  const net = Number(totalIn) - Number(totalOut);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Cash Ledger</h1>
        {canRecordEntry(profile.role) && (
          <AddEntryForm
            branches={branches.map((b) => ({ id: b.id, name: b.name }))}
            categories={LEDGER_CATEGORIES}
            fixedBranchId={allBranches ? null : profile.branchId}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="Cash In (filtered)" value={fmt(totalIn)} cls="bg-emerald-600" />
        <Card title="Cash Out (filtered)" value={fmt(totalOut)} cls="bg-red-600" />
        <Card title="Net" value={`Rs. ${net.toLocaleString("en-PK")}`} cls={net >= 0 ? "bg-slate-700" : "bg-amber-600"} />
      </div>

      <form method="get" className="flex flex-wrap gap-3">
        <select name="direction" defaultValue={params.direction ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">
          <option value="">In & Out</option>
          <option value="cash_in">Cash In</option>
          <option value="cash_out">Cash Out</option>
        </select>
        <select name="category" defaultValue={params.category ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">
          <option value="">All categories</option>
          {LEDGER_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {allBranches && (
          <select name="branch" defaultValue={params.branch ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
        <input type="date" name="from" defaultValue={params.from ?? ""} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        <input type="date" name="to" defaultValue={params.to ?? ""} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        <button className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm text-white hover:bg-slate-700">Filter</button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3 text-right">Cash In</th>
              <th className="px-4 py-3 text-right">Cash Out</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">No entries for this filter.</td>
              </tr>
            )}
            {rows.map((e) => (
              <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-500">{new Date(e.entryDate).toLocaleDateString("en-PK")}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{e.category}</span>
                </td>
                <td className="px-4 py-2.5">{e.description}</td>
                <td className="px-4 py-2.5">{e.branchName}</td>
                <td className="px-4 py-2.5 text-right text-emerald-600">
                  {e.direction === "cash_in" ? fmt(e.amount) : ""}
                </td>
                <td className="px-4 py-2.5 text-right text-red-600">
                  {e.direction === "cash_out" ? fmt(e.amount) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ title, value, cls }: { title: string; value: string; cls: string }) {
  return (
    <div className={`rounded-xl ${cls} p-5 text-white shadow-sm`}>
      <p className="text-sm opacity-80">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
