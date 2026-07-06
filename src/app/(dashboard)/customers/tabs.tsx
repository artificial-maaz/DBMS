import Link from "next/link";

/** Shared tab strip between /customers (buyers) and /customers/visitors (leads, #4). */
export function CustomerTabs({ active }: { active: "customers" | "visitors" }) {
  const tabs = [
    { key: "customers", label: "Customers", href: "/customers" },
    { key: "visitors", label: "Visitors & Leads", href: "/customers/visitors" },
  ] as const;

  return (
    <div className="flex gap-1 border-b border-slate-200">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
            active === t.key
              ? "border border-b-0 border-slate-200 bg-white text-slate-900"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
