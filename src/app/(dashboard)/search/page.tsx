import Link from "next/link";
import { globalSearch } from "@/modules/search/queries";
import { requireStaff } from "@/lib/session";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { profile } = await requireStaff();
  const { q } = await searchParams;

  if (!q?.trim()) {
    return <p className="text-sm text-ink-faint">Type in the top search bar — VIN, engine no., CNIC, phone, or invoice #.</p>;
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
        Search results for <span className="text-brand-700">“{q}”</span>
      </h1>

      {none && <p className="text-sm text-ink-faint">Nothing found across vehicles, customers, or invoices.</p>}

      {vehicles.length > 0 && (
        <Section title="Vehicles">
          {vehicles.map((v) => (
            <Link key={v.id} href="/inventory" className="block rounded-lg card p-3 hover:border-brand-300">
              <span className="font-medium">{v.make} {v.model}</span>
              <span className="ml-2 font-mono text-xs text-ink-faint">{v.chassisNo} · {v.engineNo}</span>
              <span className="ml-2 rounded-full bg-raised px-2 py-0.5 text-xs text-ink-soft">{v.status.replace("_", " ")}</span>
              <span className="ml-2 text-xs text-ink-faint">{v.branchName}</span>
            </Link>
          ))}
        </Section>
      )}

      {customers.length > 0 && (
        <Section title="Customers">
          {customers.map((c) => (
            <Link key={c.id} href={`/customers?q=${encodeURIComponent(c.phone)}`} className="block rounded-lg card p-3 hover:border-brand-300">
              <span className="font-medium">{c.fullName}</span>
              <span className="ml-2 text-xs text-ink-faint">{c.phone}</span>
              {c.cnic && <span className="ml-2 font-mono text-xs text-ink-faint">{c.cnic}</span>}
              <span className="ml-2 text-xs text-ink-faint">{c.branchName}</span>
            </Link>
          ))}
        </Section>
      )}

      {invoices.length > 0 && (
        <Section title="Invoices">
          {invoices.map((i) => (
            <Link key={i.id} href={`/sales/${i.id}`} className="block rounded-lg card p-3 hover:border-brand-300">
              <span className="font-mono font-medium text-brand-700">{i.invoiceNo}</span>
              <span className="ml-2 text-sm">{i.customerName}</span>
              <span className="ml-2 text-xs text-ink-faint">Rs. {Number(i.total).toLocaleString("en-PK")}</span>
              <span className="ml-2 rounded-full bg-raised px-2 py-0.5 text-xs text-ink-soft">{i.status}</span>
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
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
