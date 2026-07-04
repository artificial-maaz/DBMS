import Link from "next/link";
import { globalSearch } from "@/modules/search/queries";
import { requireStaff } from "@/lib/session";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { profile } = await requireStaff();
  const { q } = await searchParams;

  if (!q?.trim()) {
    return <p className="text-sm text-slate-500">Type in the top search bar — VIN, engine no., CNIC, phone, or invoice #.</p>;
  }

  const { vehicles, customers, invoices } = await globalSearch({
    q,
    role: profile.role,
    ownBranchId: profile.branchId,
  });
  const none = vehicles.length + customers.length + invoices.length === 0;

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">
        Search results for <span className="text-indigo-700">“{q}”</span>
      </h1>

      {none && <p className="text-sm text-slate-400">Nothing found across vehicles, customers, or invoices.</p>}

      {vehicles.length > 0 && (
        <Section title="Vehicles">
          {vehicles.map((v) => (
            <Link key={v.id} href="/inventory" className="block rounded-lg border border-slate-200 bg-white p-3 hover:border-indigo-300">
              <span className="font-medium">{v.make} {v.model}</span>
              <span className="ml-2 font-mono text-xs text-slate-500">{v.chassisNo} · {v.engineNo}</span>
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{v.status.replace("_", " ")}</span>
              <span className="ml-2 text-xs text-slate-400">{v.branchName}</span>
            </Link>
          ))}
        </Section>
      )}

      {customers.length > 0 && (
        <Section title="Customers">
          {customers.map((c) => (
            <Link key={c.id} href={`/customers?q=${encodeURIComponent(c.phone)}`} className="block rounded-lg border border-slate-200 bg-white p-3 hover:border-indigo-300">
              <span className="font-medium">{c.fullName}</span>
              <span className="ml-2 text-xs text-slate-500">{c.phone}</span>
              {c.cnic && <span className="ml-2 font-mono text-xs text-slate-500">{c.cnic}</span>}
              <span className="ml-2 text-xs text-slate-400">{c.branchName}</span>
            </Link>
          ))}
        </Section>
      )}

      {invoices.length > 0 && (
        <Section title="Invoices">
          {invoices.map((i) => (
            <Link key={i.id} href={`/sales/${i.id}`} className="block rounded-lg border border-slate-200 bg-white p-3 hover:border-indigo-300">
              <span className="font-mono font-medium text-indigo-700">{i.invoiceNo}</span>
              <span className="ml-2 text-sm">{i.customerName}</span>
              <span className="ml-2 text-xs text-slate-500">Rs. {Number(i.total).toLocaleString("en-PK")}</span>
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{i.status}</span>
            </Link>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
