import { SportBike } from "./vehicles";

/**
 * Dashboard hero (Sir, 2026-08-04 — "add animations, esp in dashboard...
 * animations of bikes etc").
 *
 * Uses the SAME machine as the login screen (Sir, 2026-08-06) rather than a
 * second, slightly-different bike. One shared component means the artwork can
 * never drift apart between the two screens, and a change to the bike updates
 * both at once.
 *
 * Server-rendered, no client JS, no image files — it recolours itself with the
 * brand and stops entirely for anyone with reduced-motion enabled.
 */
export function BikeHero({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="card relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white md:p-8">
      {/* Ambient glows */}
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-black/20 blur-3xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 max-w-md text-sm text-white/80">{subtitle}</p>}
        </div>

        {/* viewBox is wider than the bike so the headlamp beam and the speed
            lines trailing behind it are not clipped. */}
        <svg aria-hidden viewBox="-30 0 320 130" className="h-28 w-64 shrink-0 md:h-32 md:w-80">
          {/* Road under the wheels, streaming right-to-left like the login scene */}
          <line x1="-30" y1="104" x2="290" y2="104" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          <line
            x1="-30"
            y1="104"
            x2="290"
            y2="104"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="2.5"
            className="road-line"
          />

          {/* Outer <g> positions, inner <g> animates — a CSS transform would
              otherwise replace the SVG transform attribute outright. */}
          <g transform="translate(0 4)">
            <g className="bike">
              <SportBike />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
