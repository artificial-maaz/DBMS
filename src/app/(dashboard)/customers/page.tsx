import { canCreateCustomer, canViewCustomers, seesAllBranches } from "@/modules/customers/permissions";
import { listCustomers } from "@/modules/customers/queries";
import { listActiveBranches } from "@/modules/inventory/queries";
import { requireStaff } from "@/lib/session";
import { AddCustomerForm } from "./add-customer-form";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; branch?: string }>;
}) {
  const { profile } = await requireStaff();
  const params = await searchParams;

  if (!canViewCustomers(profile.role)) {
    return <p className="text-sm text-slate-500">You don't have access to the customer registry.</p>;
  }

  const allBranches = seesAllBranches(profile.role);
  const [rows, branches] = await Promise.all([
    listCustomers({
      role: profile.role,
      ownBranchId: profile.branchId,
      q: params.q,
      branchId: params.branch ? Number(params.branch) : undefined,
    }),
    listActiveBranches(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Customers</h1>
        {canCreateCustomer(profile.role) && (
          <AddCustomerForm
            branches={branches.map((b) => ({ id: b.id, name: b.name }))}
            fixedBranchId={allBranches ? null : profile.branchId}
          />
        )}
      </div>

      <form className="flex flex-wrap gap-3" method="get">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search name, phone, CNIC…"
          className="w-72 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
        />
        {allBranches && (
          <select name="branch" defaultValue={params.branch ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
        <button className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm text-white hover:bg-slate-700">
          Search
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <Th>Name</Th>
              <Th>Phone</Th>
              <Th>CNIC</Th>
              <Th>City</Th>
              <Th>Branch</Th>
              <Th>Registered</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No customers found.
                </td>
              </tr>
            )}
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium">{c.fullName}</td>
                <td className="px-4 py-2.5">{c.phone}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{c.cnic ?? "—"}</td>
                <td className="px-4 py-2.5">{c.city ?? "—"}</td>
                <td className="px-4 py-2.5">{c.branchName}</td>
                <td className="px-4 py-2.5 text-slate-500">
                  {new Date(c.createdAt).toLocaleDateString("en-PK")}
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
