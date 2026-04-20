import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { canReview, listApprovals } from "@/modules/approvals/service";
import { needsWarrantyCard } from "@/modules/sales/warranty";
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

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

/** Hide noisy/technical keys when summarizing a payload for review. */
const HIDDEN_KEYS = new Set(["guarantors", "documents", "handovers", "items", "notes"]);

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
            <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-medium text-amber-700">
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
          <div key={r.id} className="rounded-xl border border-amber-200 bg-surface p-4">
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
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      ✔ warranty card sent
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                      ⚠ WARRANTY CARD NOT SENT
                    </span>
                  ))}
                <span className={`pill ${STATUS_BADGE[r.status]}`}>{r.status}</span>
              </span>
            </div>

            <PayloadSummary payload={r.payload} />

            {r.lastError && (
              <p className="mt-2 rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-700">
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

/**
 * Sir (2026-08-06): the queue used to dump raw JSON, which overflowed its
 * column and was unreadable. Long JSON values (a delivery's vehicle array) are
 * now rendered as a proper list instead of a wall of braces, and every value
 * wraps rather than escaping its cell.
 */
function PayloadSummary({ payload }: { payload: unknown }) {
  if (!payload || typeof payload !== "object") return null;
  const all = Object.entries(payload as Record<string, unknown>).filter(
    ([k, v]) => !HIDDEN_KEYS.has(k) && v !== "" && v !== null && v !== undefined,
  );

  // Scalars go in the compact grid; JSON arrays get their own readable block.
  const scalars = all.filter(([, v]) => typeof v !== "object" && !looksLikeJsonArray(v));
  const lists = all.filter(([, v]) => typeof v === "object" || looksLikeJsonArray(v));

  if (scalars.length === 0 && lists.length === 0) return null;

  return (
    <div className="mt-3 space-y-3">
      {scalars.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-3 lg:grid-cols-4">
          {scalars.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-ink-faint">{prettyKey(k)}</dt>
              <dd className="break-words font-medium text-ink">{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}

      {lists.map(([k, v]) => {
        const rows = parseRows(v);
        if (rows.length === 0) return null;
        return (
          <div key={k} className="rounded-lg border border-line bg-raised p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {prettyKey(k)} <span className="font-normal">({rows.length})</span>
            </p>
            <ul className="space-y-1 text-xs">
              {rows.slice(0, 12).map((row, i) => (
                <li key={i} className="flex flex-wrap gap-x-3 gap-y-0.5">
                  <span className="font-medium text-ink">{i + 1}.</span>
                  {Object.entries(row)
                    .filter(([, val]) => val !== "" && val !== null && val !== undefined)
                    .map(([rk, val]) => (
                      <span key={rk} className="text-ink-soft">
                        <span className="text-ink-faint">{prettyKey(rk)}:</span>{" "}
                        <span className="font-medium text-ink">{String(val)}</span>
                      </span>
                    ))}
                </li>
              ))}
              {rows.length > 12 && <li className="text-ink-faint">…and {rows.length - 12} more</li>}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

const prettyKey = (k: string) => k.replace(/([A-Z])/g, " $1").toLowerCase();

const looksLikeJsonArray = (v: unknown) => typeof v === "string" && v.trim().startsWith("[");

/** Payloads arrive from FormData, so nested arrays are still JSON strings. */
function parseRows(v: unknown): Record<string, unknown>[] {
  try {
    const parsed = typeof v === "string" ? JSON.parse(v) : v;
    if (Array.isArray(parsed)) return parsed.filter((r) => r && typeof r === "object");
    if (parsed && typeof parsed === "object") return [parsed as Record<string, unknown>];
  } catch {
    /* not JSON — fall through */
  }
  return [];
}
