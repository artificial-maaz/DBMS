import Link from "next/link";

/**
 * Chart filter pills (Sir, 2026-08-06).
 *
 * Deliberately links, not a client-side control: the filter lives in the URL,
 * so a view is shareable and bookmarkable, the back button works, and the page
 * stays a server component with no extra JavaScript shipped.
 */
export function FilterPills({
  options,
  active,
  param,
  keep,
}: {
  options: Record<string, string>;
  active: string;
  /** Query-string key this group controls. */
  param: string;
  /** Other params to preserve so the two filters don't clobber each other. */
  keep?: Record<string, string | undefined>;
}) {
  const href = (value: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(keep ?? {})) if (v) q.set(k, v);
    q.set(param, value);
    return `/dashboard?${q.toString()}#charts`;
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(options).map(([value, label]) => (
        <Link
          key={value}
          href={href(value)}
          scroll={false}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
            value === active
              ? "bg-brand-100 text-brand-700"
              : "text-ink-faint hover:bg-brand-50 hover:text-brand-600"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
