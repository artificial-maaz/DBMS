import Link from "next/link";
import { APP_NAME } from "@/lib/config";

type Item = { label: string; href: string; roles?: string[] };
type Group = { title: string; items: Item[] };

/** roles omitted = visible to everyone. Filtering here is cosmetic only —
 *  real enforcement is server-side in each module (permissions.ts). */
const NAV: Group[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard" }],
  },
  {
    title: "Showroom",
    items: [
      { label: "Inventory", href: "/inventory" },
      { label: "Spare Parts", href: "/parts", roles: ["creator", "owner", "silent_partner", "branch_manager", "salesperson", "mechanic"] },
      { label: "Gate Passes", href: "/gatepass", roles: ["creator", "owner", "branch_manager", "gate_staff"] },
      { label: "Branches", href: "/branches", roles: ["creator", "owner"] },
    ],
  },
  {
    title: "Retail",
    items: [
      { label: "Customers", href: "/customers", roles: ["creator", "owner", "silent_partner", "branch_manager", "salesperson"] },
      { label: "Test Drives", href: "/test-drives", roles: ["creator", "owner", "branch_manager", "salesperson", "assistant"] },
      { label: "Bookings", href: "/bookings", roles: ["creator", "owner", "silent_partner", "branch_manager", "salesperson"] },
      { label: "Sales & Invoices", href: "/sales", roles: ["creator", "owner", "silent_partner", "branch_manager", "salesperson"] },
      { label: "Installment Cases", href: "/installments", roles: ["creator", "owner", "silent_partner", "branch_manager"] },
      { label: "Installment Plans", href: "/installment-plans", roles: ["creator", "owner", "branch_manager", "salesperson"] },
      { label: "Document Checklist", href: "/document-requirements", roles: ["creator", "owner", "branch_manager", "salesperson"] },
    ],
  },
  {
    title: "Service",
    items: [
      { label: "Workshop", href: "/workshop", roles: ["creator", "owner", "branch_manager", "mechanic"] },
      { label: "Labor Rates", href: "/labor-rates", roles: ["creator", "owner", "branch_manager", "mechanic"] },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Cash Ledger", href: "/ledger", roles: ["creator", "owner", "silent_partner", "branch_manager"] },
      { label: "Monthly P&L", href: "/reports/pnl", roles: ["creator", "owner", "silent_partner"] },
      { label: "Accounting", href: "/accounting", roles: ["creator", "owner", "silent_partner"] },
      { label: "Fixed Assets", href: "/assets", roles: ["creator", "owner", "silent_partner"] },
    ],
  },
  {
    title: "Supply Chain",
    items: [
      { label: "Stock Deliveries", href: "/deliveries", roles: ["creator", "owner", "silent_partner", "branch_manager"] },
      { label: "Stock Purchases", href: "/purchases", roles: ["creator", "owner"] },
      { label: "Suppliers", href: "/suppliers", roles: ["creator", "owner"] },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Staff", href: "/staff", roles: ["creator", "owner"] },
      { label: "HR & Payroll", href: "/hr", roles: ["creator", "owner"] },
      { label: "Bulk Import", href: "/import", roles: ["creator", "owner"] },
      { label: "Audit Log", href: "/audit", roles: ["creator", "owner"] },
      { label: "System Settings", href: "/system-settings", roles: ["creator"] },
      { label: "Settings", href: "/settings" },
    ],
  },
];

export function Sidebar({
  role,
  appName,
  logoDataUrl,
  pendingApprovals = 0,
}: {
  role: string;
  appName?: string;
  logoDataUrl?: string | null;
  pendingApprovals?: number;
}) {
  return (
    <aside className="flex w-56 shrink-0 flex-col bg-slate-900 text-slate-200 print:hidden">
      <div className="flex items-center gap-2 px-4 py-5 text-lg font-semibold text-white">
        {logoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoDataUrl} alt="" className="h-7 w-7 rounded object-contain" />
        ) : (
          "⚡"
        )}{" "}
        {appName ?? APP_NAME}
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-2 pb-6">
        {/* Maker-checker Review Queue — visible to everyone: staff track their
            own submissions, owners see everything waiting on them. */}
        <Link
          href="/approvals"
          className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium hover:bg-slate-800 hover:text-white"
        >
          <span>⏳ Review Queue</span>
          {pendingApprovals > 0 && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-slate-900">
              {pendingApprovals}
            </span>
          )}
        </Link>
        {NAV.map((group) => {
          const items = group.items.filter((i) => !i.roles || i.roles.includes(role));
          if (items.length === 0) return null;
          return (
            <div key={group.title}>
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {group.title}
              </p>
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-2 py-1.5 text-sm hover:bg-slate-800 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
