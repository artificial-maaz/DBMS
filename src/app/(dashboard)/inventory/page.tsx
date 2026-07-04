import { canSeePurchasePrice, canCreateVehicle, seesAllBranches } from "@/modules/inventory/permissions";
import { listActiveBranches, listVehicles } from "@/modules/inventory/queries";
import { requireStaff } from "@/lib/session";
import { AddVehicleForm } from "./add-vehicle-form";

const STATUS_BADGE: Record<string, string> = {
  in_stock: "bg-emerald-100 text-emerald-700",
  sold: "bg-red-100 text-red-700",
  in_transit: "bg-amber-100 text-amber-700",
  in_repair: "bg-sky-100 text-sky-700",
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; branch?: string }>;
}) {
  const { user, profile } = await requireStaff();
  const params = await searchParams;

  const showPrice = canSeePurchasePrice(profile.role);
  const allBranches = seesAllBranches(profile.role);

  const [rows, branches] = await Promise.all([
    listVehicles({
      role: profile.role,
      ownBranchId: profile.branchId,
      status: params.status,
      branchId: params.branch ? Number(params.branch) : undefined,
    }),
    listActiveBranches(),
  ]);

  const fmt = (v: string | null | undefined) =>
    v == null ? "—" : `Rs. ${Number(v).toLocaleString("en-PK")}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Showroom Inventory</h1>
        {canCreateVehicle(profile.role) && (
          <AddVehicleForm
            branches={branches.map((b) => ({ id: b.id, name: b.name }))}
            showPurchasePrice={showPrice}
            fixedBranchId={allBranches ? null : profile.branchId}
          />
        )}
      </div>

      {/* Filters — plain GET form, server does the filtering */}
      <form className="flex flex-wrap gap-3" method="get">
        <select name="status" defaultValue={params.status ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">
          <option value="">All statuses</option>
          <option value="in_stock">In stock</option>
          <option value="sold">Sold</option>
          <option value="in_transit">In transit</option>
          <option value="in_repair">In repair</option>
        </select>
        {allBranches && (
          <select name="branch" defaultValue={params.branch ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
        <button className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm text-white hover:bg-slate-700">
          Filter
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <Th>Vehicle</Th>
              <Th>Color</Th>
              <Th>Chassis / VIN</Th>
              <Th>Engine No.</Th>
              <Th>Branch</Th>
              {showPrice && <Th>Purchase</Th>}
              <Th>Sale Price</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={showPrice ? 8 : 7} className="px-4 py-10 text-center text-slate-400">
                  No vehicles registered yet.
                </td>
              </tr>
            )}
            {rows.map((v) => (
              <tr key={v.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium">
                  {v.make} {v.model}
                  {v.variant && <span className="block text-xs font-normal text-slate-500">{v.variant}</span>}
                </td>
                <td className="px-4 py-2.5">{v.color ?? "—"}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{v.chassisNo}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{v.engineNo}</td>
                <td className="px-4 py-2.5">{v.branchName}</td>
                {showPrice && <td className="px-4 py-2.5">{fmt(v.purchasePrice)}</td>}
                <td className="px-4 py-2.5">{fmt(v.salePrice)}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[v.status]}`}>
                    {v.status.replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3">{children}</th>;
}
