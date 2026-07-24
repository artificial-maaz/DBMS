import { redirect } from "next/navigation";
import { canSeeNotifications, listNotifications } from "@/modules/notifications/service";
import { requireStaff } from "@/lib/session";

const ACTION_LABELS: Record<string, string> = {
  "approval.submit": "⏳ submitted for review",
  "approval.approve": "✔ approved a submission",
  "approval.reject": "✕ rejected a submission",
  "sale.create": "🏍 finalized a sale",
  "installment.payment": "💵 collected an installment",
  "ledger.record": "🧾 recorded a ledger entry",
  "vehicle.create": "➕ registered a vehicle",
  "part.create": "🔩 registered a spare part",
  "part.adjust": "🔧 adjusted part stock",
  "booking.create": "📝 took a booking token",
  "booking.refund": "↩ refunded a booking",
  "gatepass.issue": "🚚 issued a gate pass",
  "gatepass.receive": "📦 received a transfer",
  "inventory.stock_audit": "📋 ran a stock audit",
  "staff.create": "👤 onboarded staff",
  "staff.deactivate": "🚫 deactivated staff",
  "staff.reactivate": "♻ reactivated staff",
  "purchase.create": "🛒 recorded a stock purchase",
  "purchase.pay": "💸 paid a supplier",
  "payroll.release": "💰 released payroll",
  "settings.update": "⚙ changed system settings",
  "import.vehicles": "📥 bulk-imported vehicles",
  "import.customers": "📥 bulk-imported customers",
  "import.visitors": "📥 bulk-imported visitors",
  "invoice.warranty_card_sent": "🛡 marked warranty card sent",
};

/** #27: the Creator's shoulder-tap feed, straight from the audit log. */
export default async function NotificationsPage() {
  const { user, profile } = await requireStaff();
  if (!canSeeNotifications(profile.role)) redirect("/dashboard");

  const { since, rows } = await listNotifications({ userId: user.id, role: profile.role });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Notifications</h1>
        <p className="mt-1 text-sm text-slate-500">
          Important activity across all branches — everything here also lives permanently in the Audit Log.
        </p>
      </div>

      <div className="space-y-2">
        {rows.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            Nothing yet — activity from your staff and owners will appear here.
          </p>
        )}
        {rows.map((r) => {
          const isNew = new Date(r.createdAt) > since;
          const d = r.details as Record<string, unknown> | null;
          const hint =
            (d?.invoiceNo as string) ??
            (d?.poNo as string) ??
            (d?.passNo as string) ??
            (d?.payNo as string) ??
            (d?.chassisNo as string) ??
            (d?.fullName as string) ??
            (d?.actionType as string) ??
            "";
          return (
            <div
              key={r.id}
              className={`flex items-center justify-between gap-3 rounded-lg border bg-white px-4 py-2.5 text-sm ${
                isNew ? "border-indigo-300" : "border-slate-200"
              }`}
            >
              <span>
                <span className="font-medium">{r.actorName}</span>{" "}
                <span className="text-slate-600">{ACTION_LABELS[r.action] ?? r.action}</span>
                {hint && <span className="ml-1.5 font-mono text-xs text-slate-400">{hint}</span>}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {isNew && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">new</span>
                )}
                <span className="text-xs text-slate-400">
                  {new Date(r.createdAt).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
