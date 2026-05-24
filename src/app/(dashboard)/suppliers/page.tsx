import { redirect } from "next/navigation";
import { canProcure } from "@/modules/procurement/permissions";
import { listSuppliers } from "@/modules/procurement/queries";
import { requireStaff } from "@/lib/session";
import { AddSupplierForm, SupplierRow } from "./supplier-form";

export default async function SuppliersPage() {
  const { profile } = await requireStaff();
  if (!canProcure(profile.role)) redirect("/dashboard");
  const rows = await listSuppliers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Suppliers & Manufacturers</h1>
          <p className="text-sm text-ink-faint">
            Every field is editable — contact people change. Retired suppliers keep their purchase history but drop
            out of the New Purchase list.
          </p>
        </div>
        <AddSupplierForm />
      </div>

      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-raised text-left text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Contact Person</th>
              <th className="px-4 py-3">Phone / Email</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">NTN</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-faint">
                  No suppliers registered yet.
                </td>
              </tr>
            )}
            {rows.map((s) => (
              <SupplierRow key={s.id} supplier={s} columns={7} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
