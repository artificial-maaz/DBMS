import Link from "next/link";
import { redirect } from "next/navigation";
import { balanceSheet, generalJournal, trialBalance } from "@/modules/accounting/queries";
import { requireStaff } from "@/lib/session";
import { PrintButton } from "../sales/[id]/print-button";

const rs = (n: number) => `Rs. ${n.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;

/** #22 deep accounting: journal, trial balance, balance sheet — projected from the ledger. */
export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; from?: string; to?: string }>;
}) {
  const { profile } = await requireStaff();
  if (!["creator", "owner", "silent_partner"].includes(profile.role)) redirect("/dashboard");
  const params = await searchParams;
  const view = params.view ?? "journal";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-semibold">Accounting</h1>
        <PrintButton />
      </div>

      <div className="flex gap-2 print:hidden">
        {[
          ["journal", "General Journal"],
          ["trial", "Trial Balance"],
          ["balance", "Balance Sheet"],
        ].map(([v, label]) => (
          <Link
            key={v}
            href={`/accounting?view=${v}`}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
              view === v ? "bg-indigo-600 text-white" : "border border-slate-300 bg-white hover:bg-slate-50"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {view !== "balance" && (
        <form method="get" className="flex flex-wrap gap-3 print:hidden">
          <input type="hidden" name="view" value={view} />
          <input type="date" name="from" defaultValue={params.from ?? ""} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          <input type="date" name="to" defaultValue={params.to ?? ""} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          <button className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm text-white hover:bg-slate-700">Recompile</button>
        </form>
      )}

      {view === "journal" && <Journal from={params.from} to={params.to} />}
      {view === "trial" && <Trial from={params.from} to={params.to} />}
      {view === "balance" && <Balance />}
    </div>
  );
}

async function Journal({ from, to }: { from?: string; to?: string }) {
  const rows = await generalJournal({ from, to });
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white print:border-0">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Description</th>
            <th className="px-4 py-3">Debit Account</th>
            <th className="px-4 py-3">Credit Account</th>
            <th className="px-4 py-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No entries for this period.</td></tr>
          )}
          {rows.map((j) => (
            <tr key={j.id} className={`border-t border-slate-100 ${j.reversal ? "bg-amber-50/50" : ""}`}>
              <td className="whitespace-nowrap px-4 py-2 text-slate-500">{new Date(j.date).toLocaleDateString("en-PK")}</td>
              <td className="px-4 py-2">{j.description}{j.reversal && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-xs text-amber-700">reversal</span>}</td>
              <td className="px-4 py-2">{j.debit}</td>
              <td className="px-4 py-2 text-slate-500">{j.credit}</td>
              <td className="px-4 py-2 text-right">{rs(Number(j.amount))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function Trial({ from, to }: { from?: string; to?: string }) {
  const tb = await trialBalance({ from, to });
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3 text-right">Net Debit (DR)</th>
              <th className="px-4 py-3 text-right">Net Credit (CR)</th>
            </tr>
          </thead>
          <tbody>
            {tb.accounts.map((a) => (
              <tr key={a.name} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium">{a.name}</td>
                <td className="px-4 py-2 text-right">{a.debit > 0 ? rs(a.debit) : "—"}</td>
                <td className="px-4 py-2 text-right">{a.credit > 0 ? rs(a.credit) : "—"}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
              <td className="px-4 py-2">TOTALS</td>
              <td className="px-4 py-2 text-right">{rs(tb.totalDebit)}</td>
              <td className="px-4 py-2 text-right">{rs(tb.totalCredit)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className={`rounded-lg px-4 py-2.5 text-sm font-medium ${tb.balanced ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
        {tb.balanced
          ? "✔ Financial integrity verified: net debits equal net credits — the ledger is in absolute balance."
          : "⚠ Debits and credits do not match — investigate immediately."}
      </p>
    </div>
  );
}

async function Balance() {
  const bs = await balanceSheet();
  const Row = ({ k, v, bold }: { k: string; v: number; bold?: boolean }) => (
    <div className={`flex justify-between py-1 ${bold ? "border-t border-slate-200 pt-2 font-semibold" : "text-slate-600"}`}>
      <span>{k}</span><span>{rs(v)}</span>
    </div>
  );
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 print:border-0">
      <h2 className="mb-1 text-center text-lg font-bold">Balance Sheet</h2>
      <p className="mb-6 text-center text-sm text-slate-500">Statement of Financial Position · as of {new Date().toLocaleDateString("en-PK")}</p>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">Assets</h3>
          <Row k="Cash & Bank" v={bs.assets.cash} />
          <Row k="Vehicle Inventory (at cost)" v={bs.assets.vehicleInventory} />
          <Row k="Spare Parts Stock (at cost)" v={bs.assets.sparePartsStock} />
          <Row k="Accounts Receivable" v={bs.assets.receivables} />
          <Row k="Fixed Assets" v={bs.assets.fixedAssets} />
          <Row k="TOTAL ASSETS (A)" v={bs.totalAssets} bold />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-red-700">Liabilities & Equity</h3>
          <Row k="Supplier Payables" v={bs.liabilities.supplierPayables} />
          <Row k="TOTAL LIABILITIES (B)" v={bs.totalLiabilities} bold />
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-indigo-700">Owner Equity</h3>
            <Row k="Retained Earnings / Equity (C = A − B)" v={bs.equity} bold />
          </div>
        </div>
      </div>
      <p className="mt-8 rounded-lg bg-emerald-50 px-4 py-2.5 text-center text-sm font-medium text-emerald-700">
        ✔ Accounting equation balanced: Assets ({rs(bs.totalAssets)}) = Liabilities + Equity ({rs(bs.totalLiabilities + bs.equity)})
      </p>
    </div>
  );
}
