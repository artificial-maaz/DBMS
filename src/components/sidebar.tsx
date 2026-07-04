import Link from "next/link";

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
      { label: "Branches", href: "/branches", roles: ["creator", "owner"] },
    ],
  },
  {
    title: "Retail",
    items: [
      { label: "Customers", href: "/customers" },
      { label: "Sales & Invoices", href: "/sales" },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Cash Ledger", href: "/ledger", roles: ["creator", "owner", "branch_manager"] },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Staff", href: "/staff", roles: ["creator", "owner"] },
      { label: "Settings", href: "/settings" },
    ],
  },
];

export function Sidebar({ role }: { role: string }) {
  return (
    <aside className="flex w-56 shrink-0 flex-col bg-slate-900 text-slate-200">
      <div className="flex items-center gap-2 px-4 py-5 text-lg font-semibold text-white">
        ⚡ Dealership ERP
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-2 pb-6">
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
