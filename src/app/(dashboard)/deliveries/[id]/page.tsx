import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canSeeUnitCost, canViewDeliveries } from "@/modules/deliveries/permissions";
import { getDeliveryDetail } from "@/modules/deliveries/queries";
import { requireStaff } from "@/lib/session";

const STATUS_BADGE: Record<string, string> = {
  in_stock: "bg-sky-100 text-sky-700",
  sold: "bg-emerald-100 text-emerald-700",
  in_transit: "bg-amber-100 text-amber-700",
  in_repair: "bg-purple-100 text-purple-700",
};

/** The "came when / sold when" view for one consignment (Sir #4). */
export default async function DeliveryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireStaff();
  if (!canViewDeliveries(profile.role)) redirect("/dashboard");
  const { id } = await params;

  const data = await getDeliveryDetail({ id: Number(id), role: profile.role, ownBranchId: profile.branchId });
  if (!data) notFound();
  const { delivery, branch, supplier, receiverName, units } = data;
  const showCost = canSeeUnitCost(profile.role);

  const fmt = (v: string | null) => (v == null ? "—" : `Rs. ${Number(v).toLocaleString("en-PK")}`);
  const sold = units.filter((u) => u.status === "sold").length;
  const daysHeld = (u: (typeof units)[number]) => {
    if (!u.arrivedOn) return null;
    const end = u.saleDate ? new Date(u.saleDate).getTime() : Date.now();
    return Math.max(0, Math.floor((end - new Date(u.arrivedOn).getTime()) / 86_400_000));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/deliveries" className="text-sm text-ink-faint hover:text-slate-800">← Back to Deliveries</Link>
        <span className="text-sm text-ink-faint">
          {sold} of {units.length} sold
        </span>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div>
            <h1 className="font-mono text-lg font-semibold text-brand-700">{delivery.deliveryNo}</h1>
            <p className="text-sm text-ink-faint">
              {supplier?.name ?? delivery.companyName ?? "—"} → {branch?.name}
            </p>
          </div>
          <div className="text-right text-sm text-ink-faint">
            <p className="font-medium text-slate-700">
              {new Date(delivery.deliveredOn).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium" })}
            </p>
            <p className="text-xs">received by {receiverName ?? "—"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4 text-sm lg:grid-cols-4">
          <Info k="Challan / Invoice" v={delivery.challanNo ?? "—"} />
          <Info k="Batch Reference" v={delivery.batchRef ?? "—"} />
          <Info k="Driver" v={delivery.driverName ?? "—"} />
          <Info k="Transport" v={delivery.transportPlate ?? "—"} />
        </div>

        {delivery.notes && (
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-ink-soft">
            <span className="text-xs font-semibold uppercase text-ink-faint">Notes: </span>
            {delivery.notes}
          </div>
        )}
      </div>

      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-raised text-left text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Chassis / Engine</th>
              <th className="px-4 py-3">Arrived</th>
              <th className="px-4 py-3">Sold</th>
              <th className="px-4 py-3">Days Held</th>
              {showCost && <th className="px-4 py-3 text-right">Unit Cost</th>}
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => {
              const held = daysHeld(u);
              return (
                <tr key={u.id} className="border-t border-line row-hover">
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{u.make} {u.model}</span>
                    <span className="block text-xs text-ink-faint">
                      {[u.variant, u.color].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">
                    {u.chassisNo}
                    <span className="block text-ink-faint">{u.engineNo}</span>
                  </td>
                  <td className="px-4 py-2.5 text-ink-faint">
                    {u.arrivedOn ? new Date(u.arrivedOn).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi" }) : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {u.saleDate && u.invoiceId ? (
                      <>
                        <span className="text-ink-soft">{new Date(u.saleDate).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi" })}</span>
                        <Link href={`/sales/${u.invoiceId}`} className="block font-mono text-xs text-brand-700 hover:underline">
                          {u.invoiceNo}
                        </Link>
                      </>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-ink-faint">
                    {held == null ? "—" : `${held} days`}
                    {u.status !== "sold" && held != null && <span className="block text-xs text-ink-faint">and counting</span>}
                  </td>
                  {showCost && <td className="px-4 py-2.5 text-right">{fmt(u.purchasePrice)}</td>}
                  <td className="px-4 py-2.5">
                    <span className={`pill ${STATUS_BADGE[u.status]}`}>
                      {u.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-ink-faint">{k}</p>
      <p className="font-medium">{v}</p>
    </div>
  );
}
