import { redirect } from "next/navigation";
import {
  canProcure,
  listPurchaseItems,
  listPurchases,
  listSuppliers,
  orderPatterns,
} from "@/modules/procurement/service";
import { listActiveBranches } from "@/modules/inventory/queries";
import { requireStaff } from "@/lib/session";
import { PayPurchase, ReceiveItem, RecordPurchaseForm } from "./purchase-forms";

export default async function PurchasesPage() {
  const { profile } = await requireStaff();
  if (!canProcure(profile.role)) redirect("/dashboard");

  const [rows, supplierRows, branches, patterns] = await Promise.all([
    listPurchases(),
    listSuppliers(),
    listActiveBranches(),
    orderPatterns(),
  ]);
  const items = await listPurchaseItems(rows.map((r) => r.id));
  const itemsByPo = new Map<number, typeof items>();
  for (const it of items) {
    const list = itemsByPo.get(it.poId) ?? [];
    list.push(it);
    itemsByPo.set(it.poId, list);
  }

  const fmt = (v: string | number) => `Rs. ${Number(v).toLocaleString("en-PK")}`;
  const totalOutstanding = rows.reduce((a, r) => a + (Number(r.totalCost) - Number(r.amountPaid)), 0);
  const unitsInTransit = items.reduce((a, it) => a + (it.qtyOrdered - it.qtyReceived), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Stock Purchases</h1>
        <RecordPurchaseForm
          suppliers={supplierRows.map((s) => ({ id: s.id, label: s.name }))}
          branches={branches.map((b) => ({ id: b.id, label: b.name }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:max-w-2xl">
        <Card title="Purchase Orders" value={String(rows.length)} cls="bg-slate-800" />
        <Card title="Units Awaiting Delivery" value={String(unitsInTransit)} cls={unitsInTransit > 0 ? "bg-sky-600" : "bg-emerald-700"} />
        <Card title="Payable to Suppliers" value={fmt(totalOutstanding)} cls={totalOutstanding > 0 ? "bg-amber-600" : "bg-emerald-700"} />
      </div>

      <div className="space-y-4">
        {rows.length === 0 && (
          <div className="card px-4 py-10 text-center text-ink-faint">
            No stock purchases recorded yet.
          </div>
        )}
        {rows.map((r) => {
          const outstanding = Number(r.totalCost) - Number(r.amountPaid);
          const poItems = itemsByPo.get(r.id) ?? [];
          const received = poItems.reduce((a, it) => a + it.qtyReceived, 0);
          const ordered = poItems.reduce((a, it) => a + it.qtyOrdered, 0);
          const receiptStatus =
            poItems.length === 0 ? null : received === 0 ? "pending" : received < ordered ? "partial" : "received";
          return (
            <div key={r.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-medium text-brand-700">{r.poNo}</span>
                  <span className="font-medium">{r.supplierName}</span>
                  <span className="text-xs text-ink-faint">→ {r.branchName}</span>
                  <span className="text-xs text-ink-faint">{new Date(r.purchaseDate).toLocaleDateString("en-PK")}</span>
                  {receiptStatus && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        receiptStatus === "received"
                          ? "bg-emerald-100 text-emerald-700"
                          : receiptStatus === "partial"
                            ? "bg-sky-100 text-sky-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {receiptStatus} {receiptStatus !== "pending" && `${received}/${ordered}`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span>Total {fmt(r.totalCost)}</span>
                  <span className="text-emerald-600">Paid {fmt(r.amountPaid)}</span>
                  <span className={outstanding > 0 ? "font-medium text-amber-600" : "text-ink-faint"}>
                    Due {fmt(outstanding)}
                  </span>
                  <PayPurchase poId={r.id} outstanding={outstanding} />
                </div>
              </div>

              {poItems.length > 0 ? (
                <table className="w-full text-sm">
                  <tbody>
                    {poItems.map((it) => (
                      <tr key={it.id} className="border-t border-slate-50">
                        <td className="px-4 py-2 pl-8 font-medium">{it.model}</td>
                        <td className="px-2 py-2 text-ink-faint">{it.color ?? "—"}</td>
                        <td className="px-2 py-2 text-right text-ink-soft">
                          {it.qtyReceived}/{it.qtyOrdered} received
                        </td>
                        <td className="px-2 py-2 text-right text-ink-faint">@ {fmt(it.unitCost)}</td>
                        <td className="px-2 py-2 text-right">{fmt(it.qtyOrdered * Number(it.unitCost))}</td>
                        <td className="px-4 py-2 text-right">
                          <ReceiveItem itemId={it.id} remaining={it.qtyOrdered - it.qtyReceived} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="px-4 py-2 pl-8 text-sm text-ink-faint">{r.description}</p>
              )}
            </div>
          );
        })}
      </div>

      {patterns.length > 0 && (
        <div className="card">
          <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">
            Ordering Patterns — what you buy and what actually arrives
          </h2>
          <table className="w-full text-sm">
            <thead className="bg-raised text-left text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-2.5">Model</th>
                <th className="px-4 py-2.5 text-right">Orders</th>
                <th className="px-4 py-2.5 text-right">Units Ordered</th>
                <th className="px-4 py-2.5 text-right">Units Received</th>
                <th className="px-4 py-2.5 text-right">Total Spent</th>
                <th className="px-4 py-2.5 text-right">Last Ordered</th>
              </tr>
            </thead>
            <tbody>
              {patterns.map((p) => (
                <tr key={p.model} className="border-t border-line">
                  <td className="px-4 py-2 font-medium">{p.model}</td>
                  <td className="px-4 py-2 text-right">{p.timesOrdered}</td>
                  <td className="px-4 py-2 text-right">{p.totalOrdered}</td>
                  <td className={`px-4 py-2 text-right ${p.totalReceived < p.totalOrdered ? "text-amber-600" : "text-emerald-600"}`}>
                    {p.totalReceived}
                  </td>
                  <td className="px-4 py-2 text-right">{fmt(p.totalSpent)}</td>
                  <td className="px-4 py-2 text-right text-ink-faint">
                    {new Date(p.lastOrdered).toLocaleDateString("en-PK")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
