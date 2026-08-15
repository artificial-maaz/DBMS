import { redirect } from "next/navigation";
import { canCreateCustomer, canEditCustomer, canViewCustomers, seesAllBranches } from "@/modules/customers/permissions";
import { listCustomers } from "@/modules/customers/queries";
import { listActiveBranches } from "@/modules/inventory/queries";
import { requireStaff } from "@/lib/session";
import { AddCustomerForm } from "./add-customer-form";
import { EditCustomerForm } from "./edit-customer-form";
import { CustomerTabs } from "./tabs";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { profile } = await requireStaff();
  if (!canViewCustomers(profile.role)) redirect("/dashboard");
  const params = await searchParams;

  const [rows, branches] = await Promise.all([
    listCustomers({ role: profile.role, ownBranchId: profile.branchId, q: params.q }),
    listActiveBranches(),
  ]);
  const editable = canEditCustomer(profile.role);
  // Cross-branch ops (2026-07-31): branch is a free choice, defaulting to own.
  const fixedBranchId = null;
  const defaultBranchId = seesAllBranches(profile.role) ? null : profile.branchId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Customers</h1>
        {canCreateCustomer(profile.role) && (
          <AddCustomerForm
            branches={branches.map((b) => ({ id: b.id, name: b.name }))}
            fixedBranchId={fixedBranchId}
            defaultBranchId={defaultBranchId}
          />
        )}
      </div>

      <CustomerTabs active="customers" />

      <form method="get" className="flex gap-3">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search name, phone, CNIC…"
          className="w-72 rounded-lg border border-line px-3 py-1.5 text-sm outline-none focus:border-brand-500"
        />
        <button className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-500">
          Search
        </button>
      </form>

      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-raised text-left text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">CNIC</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Registered</th>
              {editable && <th className="px-4 py-3 text-right">Action</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={editable ? 7 : 6} className="px-4 py-10 text-center text-ink-faint">
                  No customers found.
                </td>
              </tr>
            )}
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-line row-hover">
                <td className="px-4 py-2.5 font-medium">
                  <a href={`/customers/${c.id}`} className="text-brand-700 hover:underline">{c.fullName}</a>
                </td>
                <td className="px-4 py-2.5">{c.phone}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{c.cnic ?? "—"}</td>
                <td className="px-4 py-2.5">{c.city ?? "—"}</td>
                <td className="px-4 py-2.5">{c.branchName}</td>
                <td className="px-4 py-2.5 text-ink-faint">
                  {new Date(c.createdAt).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi" })}
                </td>
                {editable && (
                  <td className="px-4 py-2.5 text-right">
                    <EditCustomerForm
                      row={{
                        id: c.id,
                        fullName: c.fullName,
                        phone: c.phone,
                        cnic: c.cnic,
                        email: c.email,
                        city: c.city,
                        address: c.address,
                        branchId: c.branchId,
                      }}
                      branches={branches.map((b) => ({ id: b.id, name: b.name }))}
                      fixedBranchId={fixedBranchId}
                    />
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
