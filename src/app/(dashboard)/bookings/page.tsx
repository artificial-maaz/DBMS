import { redirect } from "next/navigation";
import { canCancelBooking, canCreateBooking, canViewBookings, seesAllBranches } from "@/modules/bookings/permissions";
import { listBookings } from "@/modules/bookings/queries";
import { listCustomers } from "@/modules/customers/queries";
import { listVisitors } from "@/modules/visitors/queries";
import { listActiveBranches } from "@/modules/inventory/queries";
import { requireStaff } from "@/lib/session";
import { AddBookingForm } from "./add-booking-form";
import { BookingStatusActions } from "./booking-status-actions";

const STATUS_BADGE: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  converted: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-ink-faint",
  refunded: "bg-red-100 text-red-700",
};
const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  online: "Online",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
};

export default async function BookingsPage() {
  const { profile } = await requireStaff();
  if (!canViewBookings(profile.role)) redirect("/dashboard");

  const [rows, customers, visitors, branches] = await Promise.all([
    listBookings({ role: profile.role, ownBranchId: profile.branchId }),
    listCustomers({ role: profile.role, ownBranchId: profile.branchId }),
    listVisitors({ role: profile.role, ownBranchId: profile.branchId }),
    listActiveBranches(),
  ]);

  const creatable = canCreateBooking(profile.role);
  const cancellable = canCancelBooking(profile.role);
  // Cross-branch ops (2026-07-31): branch is a free choice, defaulting to own.
  const fixedBranchId = null;
  const defaultBranchId = seesAllBranches(profile.role) ? null : profile.branchId;
  const fmt = (v: string) => `Rs. ${Number(v).toLocaleString("en-PK")}`;

  const openTotal = rows.filter((r) => r.status === "open").reduce((acc, r) => acc + Number(r.tokenAmount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Advance Bookings</h1>
        {creatable && (
          <AddBookingForm
            branches={branches.map((b) => ({ id: b.id, name: b.name }))}
            customers={customers.map((c) => ({ id: c.id, label: `${c.fullName} (${c.phone})` }))}
            visitors={visitors.filter((v) => v.status !== "converted").map((v) => ({ id: v.id, label: `${v.fullName} (${v.phone})` }))}
            fixedBranchId={fixedBranchId}
            defaultBranchId={defaultBranchId}
          />
        )}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span className="font-semibold">{fmt(String(openTotal))}</span> in open token commitments — use this to gauge
        demand before placing a stock order.
      </div>

      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-raised text-left text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">Model Wanted</th>
              <th className="px-4 py-3">Token</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Registered</th>
              <th className="px-4 py-3">Status</th>
              {cancellable && <th className="px-4 py-3 text-right">Action</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={cancellable ? 8 : 7} className="px-4 py-10 text-center text-ink-faint">
                  No bookings registered yet — tokens go here so you can see demand before ordering stock.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line row-hover">
                <td className="px-4 py-2.5 font-medium">
                  {r.customerName ?? r.visitorName ?? "—"}
                  {!r.customerId && r.visitorId && <span className="ml-1 text-xs font-normal text-ink-faint">(lead)</span>}
                </td>
                <td className="px-4 py-2.5">{r.modelWanted}</td>
                <td className="px-4 py-2.5">{fmt(r.tokenAmount)}</td>
                <td className="px-4 py-2.5">{METHOD_LABEL[r.paymentMethod]}</td>
                <td className="px-4 py-2.5">{r.branchName}</td>
                <td className="px-4 py-2.5 text-ink-faint">{new Date(r.createdAt).toLocaleDateString("en-PK")}</td>
                <td className="px-4 py-2.5">
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}>
                    {r.status}
                  </span>
                </td>
                {cancellable && (
                  <td className="px-4 py-2.5 text-right">
                    {r.status === "open" ? <BookingStatusActions id={r.id} /> : <span className="text-xs text-ink-faint">—</span>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
