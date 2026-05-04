import { redirect } from "next/navigation";
import { canProcure, listSuppliers } from "@/modules/procurement/service";
import { requireStaff } from "@/lib/session";
import { AddSupplierForm } from "./supplier-form";

export default async function SuppliersPage() {
  const { profile } = await requireStaff();
  if (!canProcure(profile.role)) redirect("/dashboard");
  const rows = await listSuppliers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Suppliers & Manufacturers</h1>
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
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-faint">
                  No suppliers registered yet.
                </td>
              </tr>
            )}
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-line row-hover">
                <td className="px-4 py-2.5 font-medium">{s.name}</td>
                <td className="px-4 py-2.5">{s.contactPerson ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink-faint">
                  {s.phone ?? "—"}{s.email ? ` · ${s.email}` : ""}
                </td>
                <td className="px-4 py-2.5">{s.city ?? "—"}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{s.ntn ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
