import Link from "next/link";

/**
 * Shared UI primitives (GUI phase, 2026-08-01).
 *
 * Every screen was hand-rolling the same card/table/badge markup, so a colour
 * or spacing change meant editing sixty files. These are the building blocks
 * instead — themed by the design tokens, animated by default, and sized for
 * thumbs on a phone (Sir's option B2).
 */

/** Page title row, with optional action on the right. */
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Card({
  className = "",
  hover,
  children,
}: {
  className?: string;
  hover?: boolean;
  children: React.ReactNode;
}) {
  return <div className={`card ${hover ? "card-hover" : ""} ${className}`}>{children}</div>;
}

/**
 * KPI tile palettes — deep jewel tones (Sir, 2026-08-06).
 *
 * The stock Tailwind ramps (violet-500, emerald-500, amber-500) are bright and
 * generic: they read like a framework default and they fight a deep navy brand
 * instead of sitting beside it. These are hand-mixed, all in the same low-key
 * register as the navy — burgundy, petrol, bronze, plum, forest — so the tiles
 * feel like one considered set rather than a box of highlighter pens.
 *
 * Every pair is dark enough for white text to clear WCAG AA at the light end
 * of its gradient, which is the actual constraint on how bright these can go.
 */
const TONES = {
  brand: "from-brand-500 to-brand-800",
  burgundy: "from-[#8e1c3e] to-[#4f0f22]",   // dark maroon
  petrol: "from-[#0e6d70] to-[#07393c]",     // deep teal
  bronze: "from-[#a8722c] to-[#5f3d11]",     // antique gold
  plum: "from-[#5b2c83] to-[#2f1547]",       // aubergine
  forest: "from-[#15693a] to-[#08361c]",     // hunter green
  graphite: "from-[#3d4759] to-[#1c222d]",   // cool near-black
} as const;

/**
 * KPI tile. Gradient rather than flat fill, and it lifts on hover — the
 * dashboard is the first thing staff see each morning and it should feel alive.
 */
export function StatCard({
  title,
  value,
  hint,
  tone = "brand",
  href,
}: {
  title: string;
  value: string | number;
  hint?: string;
  tone?: keyof typeof TONES;
  href?: string;
}) {
  /**
   * h-full on both the link and the card (Sir, 2026-08-06): a tile carrying a
   * `hint` used to be taller than its neighbours, so the row looked ragged.
   * Stretching every tile to the grid row's height keeps them identical, and
   * mt-auto pins the hint to the bottom rather than letting it push the card.
   */
  const body = (
    <div
      className={`card-hover relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br ${TONES[tone]} p-5 text-white shadow-[var(--shadow-card)]`}
    >
      {/* Decorative glow — pure ornament, hidden from screen readers */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10 blur-xl"
      />
      <p className="text-sm font-medium opacity-85">{title}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-auto pt-2 text-xs opacity-75">{hint}</p>}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

const BADGE_TONES: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
  violet: "bg-violet-100 text-violet-700",
  teal: "bg-teal-100 text-teal-700",
  brand: "bg-brand-100 text-brand-700",
  grey: "bg-raised text-ink-soft",
};

export function Badge({ tone = "grey", children }: { tone?: keyof typeof BADGE_TONES; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium capitalize ${BADGE_TONES[tone] ?? BADGE_TONES.grey}`}
    >
      {children}
    </span>
  );
}

/**
 * Empty state. The old "No records found" told staff nothing — this says what
 * the screen is FOR and what to do next, which matters most for the people
 * who only open one module a week.
 */
export function EmptyState({
  icon = "📭",
  title,
  hint,
  action,
}: {
  icon?: string;
  title: string;
  hint?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="animate-rise flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-3xl">{icon}</div>
      <p className="font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-ink-soft">{hint}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-4 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-500 active:scale-95"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

/** Scrollable table shell with the standard header styling. */
export function TableCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`bg-raised px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-ink-faint ${right ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}
