import Link from "next/link";
import { notFound } from "next/navigation";
import { canCreateSale } from "@/modules/sales/permissions";
import { getInvoiceDetail } from "@/modules/sales/queries";
import { requireStaff } from "@/lib/session";
import { CollectPayment } from "./collect-payment";
import { PrintButton } from "./print-button";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireStaff();
  const { id } = await params;

  const data = await getInvoiceDetail({
    id: Number(id),
    role: profile.role,
    ownBranchId: profile.branchId,
  });
  if (!data) notFound();
  const { invoice, customer, branch, items, schedule } = data;

  const fmt = (v: string | null) => (v == null ? "—" : `Rs. ${Number(v).toLocaleString("en-PK")}`);
  const d = (v: Date | string) => new Date(v).toLocaleDateString("en-PK");
  const today = new Date().toISOString().slice(0, 10);
  const collector = canCreateSale(profile.role);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/sales" className="text-sm text-slate-500 hover:text-slate-800">← Back to Sales</Link>
        <PrintButton />
      </div>

      {/* Printable document */}
      <div className="rounded-xl border border-slate-200 bg-white p-8 print:border-0 print:p-0">
        <div className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold">⚡ {branch?.name ?? "Dealership"}</h1>
            <p className="text-sm text-slate-500">Official Sale Invoice</p>
            {branch?.address && <p className="text-sm text-slate-500">{branch.address}, {branch.city}</p>}
            {branch?.phone && <p className="text-sm text-slate-500">{branch.phone}</p>}
          </div>
          <div className="text-right">
            <p className="font-mono text-lg font-semibold">{invoice.invoiceNo}</p>
            <p className="text-sm text-slate-500">Date: {d(invoice.createdAt)}</p>
            <p className="mt-1">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium capitalize text-emerald-700">
                {invoice.status} · {invoice.settlementPlan}
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 py-6 text-sm">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</p>
            <p className="font-medium">{customer?.fullName}</p>
            <p className="text-slate-600">{customer?.phone}</p>
            {customer?.cnic && <p className="text-slate-600">CNIC: {customer.cnic}</p>}
            {customer?.address && <p className="text-slate-600">{customer.address}</p>}
          </div>
          <div className="text-right">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Issued by</p>
            <p className="font-medium">{branch?.name}</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="border-y border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-slate-100">
                <td className="py-2.5">{it.description}</td>
                <td className="py-2.5 text-right">{fmt(it.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-4 w-64 space-y-1.5 text-sm">
          <Row k="Subtotal" v={fmt(invoice.subtotal)} />
          {Number(invoice.discount) > 0 && <Row k="Discount" v={`− ${fmt(invoice.discount)}`} />}
          <div className="border-t border-slate-200 pt-1.5">
            <Row k="Total" v={fmt(invoice.total)} bold />
          </div>
          <Row k="Paid / Downpayment" v={fmt(invoice.downpayment)} />
          <Row k="Balance Due" v={fmt(invoice.balanceDue)} bold red={Number(invoice.balanceDue) > 0} />
        </div>

        {schedule.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-2 text-sm font-semibold">Installment Schedule ({schedule.length} months)</h2>
            <table className="w-full text-sm">
              <thead className="border-y border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2">#</th>
                  <th className="py-2">Due Date</th>
                  <th className="py-2 text-right">Principal</th>
                  <th className="py-2 text-right">Markup</th>
                  <th className="py-2 text-right">Total Due</th>
                  <th className="py-2 text-right">Paid</th>
                  <th className="py-2 text-right">Status</th>
                  {collector && <th className="py-2 text-right print:hidden">Action</th>}
                </tr>
              </thead>
              <tbody>
                {schedule.map((r) => {
                  const overdue = r.status === "pending" && r.dueDate < today;
                  const display = overdue ? "overdue" : r.status;
                  const remaining = Number(r.totalDue) + Number(r.lateFee) - Number(r.paidAmount);
                  return (
                    <tr key={r.id} className="border-b border-slate-100">
                      <td className="py-2">{r.installmentNo}</td>
                      <td className="py-2">{d(r.dueDate)}</td>
                      <td className="py-2 text-right">{fmt(r.principal)}</td>
                      <td className="py-2 text-right">{fmt(r.markup)}</td>
                      <td className="py-2 text-right font-medium">{fmt(r.totalDue)}</td>
                      <td className="py-2 text-right">{fmt(r.paidAmount)}</td>
                      <td className="py-2 text-right">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            display === "paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : display === "overdue"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {display}
                        </span>
                      </td>
                      {collector && (
                        <td className="py-2 text-right print:hidden">
                          {r.status !== "paid" && <CollectPayment scheduleId={r.id} remaining={remaining} />}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-10 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
          Generated by Dealership ERP · {d(new Date())}
        </p>
      </div>
    </div>
  );
}

function Row({ k, v, bold, red }: { k: string; v: string; bold?: boolean; red?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : "text-slate-600"} ${red ? "text-red-600" : ""}`}>
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}
