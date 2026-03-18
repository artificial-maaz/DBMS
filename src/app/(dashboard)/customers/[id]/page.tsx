import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer360 } from "@/modules/customers/queries";
import { requireStaff } from "@/lib/session";

const INV_BADGE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  settled: "bg-sky-100 text-sky-700",
  cancelled: "bg-red-100 text-red-700",
};

/** Abrar #2: the Customer 360 — everything about one customer on one page. */
export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireStaff();
  const { id } = await params;

  const data = await getCustomer360({ id: Number(id), role: profile.role, ownBranchId: profile.branchId });
  if (!data) notFound();
  const { customer, branch, purchases, bookings, rides, jobs } = data;

  const fmt = (v: string | number) => `Rs. ${Number(v).toLocaleString("en-PK")}`;
  const d = (v: string | Date) => new Date(v).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi" });
  const totalSpent = purchases.filter((p) => p.status !== "cancelled").reduce((a, p) => a + Number(p.total), 0);
  const outstanding = purchases.filter((p) => p.status === "active").reduce((a, p) => a + Number(p.balanceDue), 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/customers" className="text-sm text-ink-faint hover:text-slate-800">← Back to Customers</Link>
      </div>

      {/* Profile header */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{customer.fullName}</h1>
            <p className="mt-1 text-sm text-ink-faint">
              {customer.phone}
              {customer.cnic && <> · CNIC <span className="font-mono">{customer.cnic}</span></>}
              {customer.email && <> · {customer.email}</>}
            </p>
            {customer.address && <p className="text-sm text-ink-faint">{customer.address}{customer.city ? `, ${customer.city}` : ""}</p>}
            <p className="mt-1 text-xs text-ink-faint">
              {branch?.name} · customer since {d(customer.createdAt)}
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Stat label="Purchases" value={String(purchases.length)} />
            <Stat label="Total Business" value={fmt(totalSpent)} />
            <Stat label="Outstanding" value={fmt(outstanding)} warn={outstanding > 0} />
          </div>
        </div>
      </div>

      {/* Purchases */}
      <Section title={`Purchases (${purchases.length})`}>
        {purchases.length === 0 && <Empty text="No purchases yet." />}
        {purchases.map((p) => (
          <Link
            key={p.id}
            href={`/sales/${p.id}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg card px-4 py-3 hover:border-brand-300"
          >
            <span>
              <span className="font-mono text-xs font-medium text-brand-700">{p.invoiceNo}</span>
              <span className="ml-2 text-sm font-medium">{p.vehicleDesc ?? "—"}</span>
              <span className="mt-0.5 block text-xs text-ink-faint">{d(p.saleDate)}</span>
            </span>
            <span className="flex items-center gap-3 text-sm">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.settlementPlan === "cash" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {p.settlementPlan}
              </span>
              <span>{fmt(p.total)}</span>
              {Number(p.balanceDue) > 0 && <span className="text-red-600">due {fmt(p.balanceDue)}</span>}
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${INV_BADGE[p.status]}`}>{p.status}</span>
            </span>
          </Link>
        ))}
        <p className="text-xs text-ink-faint">
          Open any purchase for full details: vehicle, installment schedule, guarantors, and document custody.
        </p>
      </Section>

      {/* Bookings */}
      <Section title={`Bookings (${bookings.length})`}>
        {bookings.length === 0 && <Empty text="No advance bookings." />}
        {bookings.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-lg card px-4 py-2.5 text-sm">
            <span className="font-medium">{b.modelWanted}</span>
            <span className="flex items-center gap-3">
              <span>token {fmt(b.tokenAmount)}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{b.status}</span>
              <span className="text-xs text-ink-faint">{d(b.createdAt)}</span>
            </span>
          </div>
        ))}
      </Section>

      {/* Test drives */}
      <Section title={`Test Drives (${rides.length})`}>
        {rides.length === 0 && <Empty text="No test drives." />}
        {rides.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg card px-4 py-2.5 text-sm">
            <span>{r.vehicleText ?? "—"}</span>
            <span className="flex items-center gap-3">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{r.status.replace("_", " ")}</span>
              <span className="text-xs text-ink-faint">
                {new Date(r.scheduledAt).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })}
              </span>
            </span>
          </div>
        ))}
      </Section>

      {/* Workshop history */}
      <Section title={`Workshop Visits (${jobs.length})`}>
        {jobs.length === 0 && <Empty text="No workshop visits." />}
        {jobs.map((j) => (
          <Link
            key={j.id}
            href={`/workshop/${j.id}`}
            className="flex items-center justify-between rounded-lg card px-4 py-2.5 text-sm hover:border-brand-300"
          >
            <span>
              <span className="font-mono text-xs font-medium text-brand-700">{j.jobNo}</span>
              <span className="ml-2 font-mono text-xs text-ink-faint">{j.chassisNo}</span>
            </span>
            <span className="flex items-center gap-3">
              {j.warrantyStatus === "free_coupon" && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">coupon #{j.couponNo}</span>
              )}
              <span>{fmt(Number(j.laborCharge) + Number(j.partsCharge))}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{j.status.replace("_", " ")}</span>
              <span className="text-xs text-ink-faint">{d(j.createdAt)}</span>
            </span>
          </Link>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">{title}</h2>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg card px-4 py-4 text-sm text-ink-faint">{text}</p>;
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-2 text-center">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className={`font-semibold ${warn ? "text-red-600" : ""}`}>{value}</p>
    </div>
  );
}
