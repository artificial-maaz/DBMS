"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
      { label: "Handover Checklist", href: "/handover-requirements", roles: ["creator", "owner", "branch_manager", "salesperson"] },
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
  const pathname = usePathname();

  /**
   * Sir (2026-08-04): show WHERE YOU ARE. A section counts as current when the
   * path matches it exactly or is nested beneath it — so /sales/new and
   * /sales/42 both keep "Sales & Invoices" lit. The `/` guard matters:
   * without it "/installments" would also light "/installment-plans".
   */
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const linkClass = (href: string) =>
    `relative block rounded-lg px-3 py-2.5 text-sm transition ${
      isCurrent(href)
        ? "bg-white/12 font-medium text-white before:absolute before:inset-y-1.5 before:-left-1 before:w-1 before:rounded-full before:bg-[var(--b400)]"
        : "hover:translate-x-0.5 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-slate-900 text-slate-200 print:hidden">
      {/* Brand bar — a soft brand-tinted wash separates it from the nav */}
      <div className="flex items-center gap-2.5 border-b border-white/5 bg-gradient-to-br from-white/[0.06] to-transparent px-4 py-5 text-lg font-semibold text-white">
        {logoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoDataUrl} alt="" className="h-8 w-8 rounded-lg object-contain" />
        ) : (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-base"
            style={{ backgroundColor: "var(--b600)" }}
          >
            ⚡
          </span>
        )}
        <span className="truncate">{appName ?? APP_NAME}</span>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-2.5 py-4">
        {/* Maker-checker Review Queue — visible to everyone: staff track their
            own submissions, owners see everything waiting on them. */}
        <Link
          href="/approvals"
          className={`flex items-center justify-between ${linkClass("/approvals")} font-medium`}
        >
          <span>⏳ Review Queue</span>
          {pendingApprovals > 0 && (
            <span className="animate-pop rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-slate-900">
              {pendingApprovals}
            </span>
          )}
        </Link>
        {NAV.map((group) => {
          const items = group.items.filter((i) => !i.roles || i.roles.includes(role));
          if (items.length === 0) return null;
          // Brighten the group heading too, so the section reads at a glance.
          const groupActive = items.some((i) => isCurrent(i.href));
          return (
            <div key={group.title}>
              <p
                /*
                 * Sir (2026-08-06): a heading and its links were reading as the
                 * same thing. Colour alone was never going to separate them —
                 * they now differ on THREE axes at once: size (10px vs 14px),
                 * weight, and letter-spacing, plus a hairline rule above the
                 * group. That reads as a section label at a glance.
                 */
                className={`mb-1 border-t border-white/5 px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[0.14em] transition ${
                  groupActive ? "text-[var(--chip-ink)]" : "text-slate-500/80"
                }`}
              >
                {group.title}
              </p>
              {items.map((item) => (
                /* py-2.5 keeps every row a comfortable thumb target on phones */
                <Link key={item.href} href={item.href} className={linkClass(item.href)}>
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
