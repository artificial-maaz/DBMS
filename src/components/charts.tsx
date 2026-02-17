/**
 * Charts, hand-built in SVG (GUI phase, 2026-08-04).
 *
 * Deliberately dependency-free — Recharts/Chart.js would add ~150KB to every
 * page load on staff phones, and neither can read our CSS design tokens, so
 * they would ignore the brand colour and dark mode. These are ~200 lines,
 * render on the SERVER (no client JS at all), animate with pure CSS, and
 * inherit the theme automatically.
 */

/* ------------------------------------------------------------------ */
/* Smooth area/line trend                                              */
/* ------------------------------------------------------------------ */

/** Catmull-Rom → cubic Bézier: gives the curve its natural, non-jagged flow. */
function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function AreaTrend({
  data,
  height = 190,
  format = (n: number) => String(n),
}: {
  data: { label: string; value: number }[];
  height?: number;
  format?: (n: number) => string;
}) {
  if (data.length === 0) return null;

  const W = 640;
  const H = height;
  const padY = 26;
  const max = Math.max(...data.map((d) => d.value), 1);
  const step = data.length > 1 ? W / (data.length - 1) : W;

  const pts = data.map((d, i) => ({
    x: i * step,
    y: H - padY - (d.value / max) * (H - padY * 2),
  }));

  const line = smoothPath(pts);
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-44 w-full overflow-visible">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--b500)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--b500)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal guides */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="0"
            x2={W}
            y1={padY + f * (H - padY * 2)}
            y2={padY + f * (H - padY * 2)}
            stroke="var(--line)"
            strokeWidth="1"
          />
        ))}

        <path d={area} fill="url(#areaFill)" className="chart-area" />
        <path
          d={line}
          fill="none"
          stroke="var(--b500)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="chart-line"
        />

        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="var(--surface)"
            stroke="var(--b500)"
            strokeWidth="2.5"
            className="chart-dot"
            style={{ animationDelay: `${420 + i * 70}ms` }}
          >
            <title>{`${data[i].label}: ${format(data[i].value)}`}</title>
          </circle>
        ))}
      </svg>

      <div className="mt-1 flex justify-between text-[11px] text-ink-faint">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Donut                                                               */
/* ------------------------------------------------------------------ */

/**
 * Donut slices — the same deep jewel set as the KPI tiles (Sir, 2026-08-06),
 * so a colour means the same thing wherever it appears on the dashboard.
 * Ordered so neighbouring slices never share a hue family.
 */
const SLICE_COLORS = ["var(--b500)", "#8e1c3e", "#0e6d70", "#a8722c", "#5b2c83", "#15693a"];

export function Donut({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: { label: string; value: number }[];
  centerLabel?: string;
  centerValue?: string | number;
}) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  if (total === 0) return null;

  const R = 62;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0 -rotate-90">
        {slices.map((s, i) => {
          const len = (s.value / total) * C;
          const dash = `${len} ${C - len}`;
          const el = (
            <circle
              key={s.label}
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke={SLICE_COLORS[i % SLICE_COLORS.length]}
              strokeWidth="22"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              className="donut-slice"
              style={{ animationDelay: `${i * 110}ms` }}
            >
              <title>{`${s.label}: ${s.value}`}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
      </svg>

      <div className="min-w-0 flex-1">
        {centerValue !== undefined && (
          <p className="mb-2">
            <span className="text-2xl font-semibold tabular-nums">{centerValue}</span>{" "}
            <span className="text-sm text-ink-soft">{centerLabel}</span>
          </p>
        )}
        <ul className="space-y-1.5">
          {slices.map((s, i) => (
            <li key={s.label} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }}
              />
              <span className="min-w-0 flex-1 truncate text-ink-soft">{s.label}</span>
              <span className="font-medium tabular-nums">{s.value}</span>
              <span className="w-10 text-right text-xs text-ink-faint tabular-nums">
                {Math.round((s.value / total) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Horizontal bars                                                     */
/* ------------------------------------------------------------------ */

export function BarList({
  rows,
  format = (n: number) => String(n),
}: {
  rows: { label: string; value: number }[];
  format?: (n: number) => string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium">{r.label}</span>
            <span className="shrink-0 tabular-nums text-ink-soft">{format(r.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-raised">
            <div
              className="bar-grow h-full rounded-full"
              style={{
                width: `${(r.value / max) * 100}%`,
                background: "linear-gradient(90deg, var(--b400), var(--b600))",
                animationDelay: `${i * 90}ms`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
