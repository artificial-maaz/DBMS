/**
 * Vehicle artwork for the login scene (Sir, 2026-08-06).
 *
 * CHOSEN: sport bike, no rider, REAR brake disc only.
 *
 * The reasoning is worth keeping: the front wheel already carries the fork,
 * fairing and windscreen, so a disc there competes for attention, while the
 * rear wheel is otherwise bare and a disc gives that end something to hold.
 * The rejected variants (scooter, cruiser, silhouette, fleet, ridden sport
 * bike) were removed rather than left dead in the bundle — they live in git
 * history if we ever want them back.
 *
 * Conventions: wheels sit on y = 96, the machine faces RIGHT, nothing exceeds
 * ~250 units wide. Wheel spin is always nested — an outer <g> translates, an
 * inner <g> carries the animation, because a CSS transform would otherwise
 * replace the SVG transform attribute outright.
 */

const STROKE = "#fff";

function Wheel({ cx, r = 16 }: { cx: number; r?: number }) {
  return (
    <g transform={`translate(${cx} ${96 - r})`}>
      <g className="bike-wheel">
        <circle r={r} fill="none" stroke={STROKE} strokeWidth="3.2" />
        <line x1="0" y1={-r} x2="0" y2={r} stroke="rgba(255,255,255,0.45)" strokeWidth="1.8" />
        <line x1={-r} y1="0" x2={r} y2="0" stroke="rgba(255,255,255,0.45)" strokeWidth="1.8" />
      </g>
    </g>
  );
}

export function SportBike() {
  return (
    <g>
      <Wheel cx={54} r={17} />
      <Wheel cx={196} r={17} />

      {/* Swingarm + frame spine */}
      <path
        d="M54 79 L104 66 M104 66 L150 58 L176 62"
        fill="none"
        stroke={STROKE}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Raked front fork */}
      <path d="M196 79 L168 34" fill="none" stroke={STROKE} strokeWidth="3.6" strokeLinecap="round" />
      {/* Tank + tail: one wedge, high at the back — the sportbike signature */}
      <path d="M96 62 L104 44 L146 44 L162 56 L150 60 L104 66 Z" fill="rgba(255,255,255,0.9)" />
      {/* Tail kick-up */}
      <path d="M96 62 L82 44 L104 44" fill="rgba(255,255,255,0.55)" />
      {/* Clip-on bars */}
      <path d="M164 32 L184 30" fill="none" stroke={STROKE} strokeWidth="3.4" strokeLinecap="round" />
      {/* Fairing. No coloured lamp dot — the beam alone reads as a headlight and
          keeps the whole scene monochrome. */}
      <path d="M172 38 L192 30 L194 44 Z" fill="rgba(255,255,255,0.85)" />
      <path d="M194 36 L262 20 L262 54 Z" fill="rgba(255,255,255,0.12)" />

      {/* Detail that carries the space the rider used to occupy — without it
          the machine reads as an unfinished outline. */}
      <path d="M170 34 L182 20 L190 26 L178 38 Z" fill="rgba(255,255,255,0.55)" />
      <path d="M172 30 L166 20 M160 18 L172 18" fill="none" stroke={STROKE} strokeWidth="2.6" strokeLinecap="round" />
      {/* Rear seat cowl */}
      <path d="M82 44 L104 44 L100 34 L86 36 Z" fill="rgba(255,255,255,0.75)" />
      {/* Engine block with cooling fins */}
      <path d="M108 66 L142 62 L146 78 L112 82 Z" fill="rgba(255,255,255,0.32)" />
      <path d="M114 68 L114 80 M124 67 L124 79 M134 66 L134 78" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
      {/* Exhaust sweeping back */}
      <path d="M108 80 L64 86" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="5" strokeLinecap="round" />
      {/* Rear brake disc only */}
      <circle cx="54" cy="79" r="8" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />

      {/* Speed lines trailing behind — they only ever sit BEHIND the machine,
          which is part of what makes the travel direction readable. */}
      <g stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" className="speed-lines">
        <line x1="-4" y1="52" x2="26" y2="52" />
        <line x1="-18" y1="66" x2="10" y2="66" />
        <line x1="-2" y1="80" x2="26" y2="80" />
      </g>
    </g>
  );
}
