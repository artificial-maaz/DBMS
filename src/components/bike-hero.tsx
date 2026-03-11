/**
 * Dashboard hero (Sir, 2026-08-04 — "add animations, esp in dashboard...
 * animations of bikes etc").
 *
 * A pure-SVG motorbike that rides in on load, then idles with a gentle bob
 * while its wheels turn and the road streams past. Server-rendered, no client
 * JS, no image files — it recolours itself with the brand and stops entirely
 * for anyone with reduced-motion enabled.
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

        <svg aria-hidden viewBox="0 0 240 110" className="h-24 w-56 shrink-0 md:h-28 md:w-64">
          {/* Road */}
          <line x1="0" y1="96" x2="240" y2="96" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
          <line
            x1="0"
            y1="96"
            x2="240"
            y2="96"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="2"
            className="road-line"
          />

          <g className="bike">
            {/* Wheels */}
            <g className="bike-wheel">
              <circle cx="56" cy="80" r="16" fill="none" stroke="#fff" strokeWidth="3.5" />
              <line x1="56" y1="64" x2="56" y2="96" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
              <line x1="40" y1="80" x2="72" y2="80" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
            </g>
            <g className="bike-wheel">
              <circle cx="176" cy="80" r="16" fill="none" stroke="#fff" strokeWidth="3.5" />
              <line x1="176" y1="64" x2="176" y2="96" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
              <line x1="160" y1="80" x2="192" y2="80" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
            </g>

            {/* Frame */}
            <path
              d="M56 80 L92 52 L140 52 L176 80 M92 52 L112 80 L176 80"
              fill="none"
              stroke="#fff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Seat + tank */}
            <path d="M96 50 L128 50 L134 44 L104 44 Z" fill="rgba(255,255,255,0.92)" />
            {/* Handlebar */}
            <path d="M140 52 L152 34 M144 30 L164 30" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
            {/* Headlamp */}
            <circle cx="166" cy="42" r="5" fill="#fde68a" />
            {/* Speed lines */}
            <g stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round">
              <line x1="6" y1="44" x2="30" y2="44" />
              <line x1="0" y1="58" x2="20" y2="58" />
              <line x1="12" y1="70" x2="34" y2="70" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
