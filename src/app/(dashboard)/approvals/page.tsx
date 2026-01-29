import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { canReview, listApprovals } from "@/modules/approvals/service";
import { needsWarrantyCard } from "@/modules/sales/warranty";
import { PayloadSummary } from "@/components/payload-summary";
import { requireStaff } from "@/lib/session";
import { ReviewControls } from "./review-controls";

const TYPE_LABELS: Record<string, string> = {
  "sale.create": "New Sale",
  "installment.payment": "Installment Payment",
  "ledger.record": "Ledger Entry / Expense",
  "booking.create": "Advance Booking",
  "booking.cancel": "Booking Cancellation",
  "booking.refund": "Booking Refund",
  "vehicle.create": "Vehicle Registration",
  "delivery.create": "Stock Delivery (batch intake)",
  "part.create": "Spare Part Registration",
  "part.adjust": "Stock Adjustment",
  "gatepass.issue": "Gate Pass — Issue",
  "gatepass.receive": "Gate Pass — Receive",
  "gatepass.cancel": "Gate Pass — Cancel",
  "stock.audit": "Stock Audit Report",
};

/** #16: off the semantic status ramp, so both themes are handled by construction. */
const STATUS_BADGE: Record<string, string> = {
  pending: "bg-warn-soft text-warn",
  approved: "bg-ok-soft text-ok",
  rejected: "bg-danger-soft text-danger",
};

export default async function ApprovalsPage() {
  const { user, profile } = await requireStaff();
  const reviewer = canReview(profile.role);
  const rows = await listApprovals({ userId: user.id, role: profile.role, branchId: profile.branchId });

  const pending = rows.filter((r) => r.status === "pending");
  const history = rows.filter((r) => r.status !== "pending");

  // #14: the warranty-card pill is Yadea-only. A pending sale carries only a
  // vehicleId in its payload, so resolve the makes in ONE query for the whole
  // page — a per-row lookup would turn a busy queue into N round trips.
  const pendingVehicleIds = [
    ...new Set(
      pending
        .filter((r) => r.actionType === "sale.create")
        .map((r) => Number((r.payload as Record<string, unknown>)?.vehicleId))
        .filter((n) => Number.isFinite(n) && n > 0),
    ),
  ];
  const makeByVehicleId = new Map<number, string>();
  if (pendingVehicleIds.length > 0) {
    const found = await db
      .select({ id: vehicles.id, make: vehicles.make })
      .from(vehicles)
      .where(inArray(vehicles.id, pendingVehicleIds));
    for (const v of found) makeByVehicleId.set(v.id, v.make);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          Review Queue
          {pending.length > 0 && (
            <span className="ml-2 rounded-full bg-warn-soft px-2.5 py-0.5 text-sm font-medium text-warn">
              {pending.length} pending
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-ink-faint">
          {reviewer
            ? "Staff submissions wait here until you approve them — nothing touches stock or the books before that."
            : "Your submissions and their review status. Approved items appear in the system automatically."}
        </p>
      </div>

      <div className="space-y-3">
        {pending.length === 0 && (
          <div className="card px-4 py-8 text-center text-sm text-ink-faint">
            Nothing pending — the queue is clear.
          </div>
        )}
        {pending.map((r) => (
          <div key={r.id} className="rounded-xl border border-warn/30 bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-semibold">{TYPE_LABELS[r.actionType] ?? r.actionType}</span>
                <span className="ml-2 text-xs text-ink-faint">
                  by {r.submitterName} · {new Date(r.createdAt).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
              <span className="flex items-center gap-2">
                {r.actionType === "sale.create" &&
                  needsWarrantyCard(makeByVehicleId.get(Number((r.payload as Record<string, unknown>)?.vehicleId))) &&
                  ((r.payload as Record<string, unknown>)?.warrantyCardSent === "on" ? (
                    <span className="rounded-full bg-ok-soft px-2 py-0.5 text-xs font-medium text-ok">
                      ✔ warranty card sent
                    </span>
                  ) : (
                    <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger">
                      ⚠ WARRANTY CARD NOT SENT
                    </span>
                  ))}
                <span className={`pill ${STATUS_BADGE[r.status]}`}>{r.status}</span>
              </span>
            </div>

            <PayloadSummary payload={r.payload} />

            {r.lastError && (
              <p className="mt-2 rounded-md bg-danger-soft px-3 py-1.5 text-xs text-danger">
                Last approval attempt failed: {r.lastError}
              </p>
            )}

            {reviewer && (
              <div className="mt-3 border-t border-line pt-3">
                <ReviewControls pendingId={r.id} />
              </div>
            )}
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-faint">Recent Decisions</h2>
          <div className="overflow-x-auto card">
            <table className="w-full text-sm">
              <tbody>
                {history.slice(0, 30).map((r) => (
                  <tr key={r.id} className="border-t border-line">
                    <td className="px-4 py-2 font-medium">{TYPE_LABELS[r.actionType] ?? r.actionType}</td>
                    <td className="px-4 py-2 text-ink-faint">{r.submitterName}</td>
                    <td className="px-4 py-2">
                      <span className={`pill ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-ink-faint">{r.reviewNote ?? ""}</td>
                    <td className="px-4 py-2 text-right text-xs text-ink-faint">
                      {new Date(r.createdAt).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
