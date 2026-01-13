/**
 * Login backdrop — "the road" (Sir's option 1, 2026-08-06).
 *
 * Layers, back to front: sky glow → distant skyline → nearer skyline → ground
 * → road markings → bike. The two skylines pan at different speeds; that speed
 * difference is what the eye reads as distance.
 *
 * BUG FIXED (2026-08-06): the bike was floating in the corner because a CSS
 * `transform` animation on an element that also carries an SVG `transform`
 * ATTRIBUTE replaces it entirely — the positioning was silently discarded. The
 * fix is to nest: an outer <g> holds the position, an inner <g> holds the
 * animation. Same trap applies to the wheels, which spin about their own centre.
 *
 * Pure SVG + CSS: no images, no client JS, re-themes with the brand colour, and
 * stops completely under prefers-reduced-motion (handled in globals.css).
 *
 */
import { SportBike } from "./vehicles";

export function RoadScene({
  fit = "cover",
}: {
  /**
   * "cover" (slice) fills a tall panel and crops the sides — right for the
   * login. "contain" (meet) fits the whole scene inside a short, wide box
   * without cropping.
   */
  fit?: "cover" | "contain";
}) {
  return (
    /*
     * Sir (2026-08-06): dark, but never so dark the scene disappears. The
     * gradient deliberately stops at brand-800 rather than 900 — with a deep
     * preset like Midnight, brand-900 is almost black and the skyline vanishes
     * into it. Starting at 600 keeps the sky luminous enough for the buildings
     * to read at every preset, including the darkest.
     */
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-brand-600 via-brand-700 to-brand-800">
      {/* Sky glow */}
      <span aria-hidden className="pointer-events-none absolute left-1/2 top-[12%] h-72 w-72 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-24 left-1/2 h-72 w-[80%] -translate-x-1/2 rounded-full bg-black/30 blur-3xl" />

      <svg
        aria-hidden
        viewBox="0 0 1200 800"
        preserveAspectRatio={fit === "cover" ? "xMidYMid slice" : "xMidYMax meet"}
        className="absolute inset-0 h-full w-full"
      >
        {/*
          Sir (2026-08-06): both skylines are now DARK silhouettes against the
          lit sky, near darker than far. That is how a real skyline reads at
          dusk, and it stops the buildings looking like translucent bars. The
          gradient starting at brand-600 is what makes this safe — the sky stays
          luminous enough for black overlays to separate from it.
        */}
        {/* Distant: shorter, lighter, slowest */}
        <g className="skyline-back" fill="rgba(0,0,0,0.20)">
          <Skyline offset={0} scale={0.62} />
          <Skyline offset={1200} scale={0.62} />
        </g>

        {/* Nearer: taller, darker, faster */}
        <g className="skyline-front" fill="rgba(0,0,0,0.36)">
          <Skyline offset={0} scale={1} seedShift />
          <Skyline offset={1200} scale={1} seedShift />
        </g>

        {/* --- Ground: a dark band anchors the scene and makes the white
                road markings and bike pop against it --- */}
        <rect x="0" y="620" width="1200" height="180" fill="rgba(0,0,0,0.32)" />
        <line x1="0" y1="620" x2="1200" y2="620" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />

        {/*
          Direction cues, all pulling the SAME way (right-to-left ground travel
          = bike heading right). One contradicting layer is enough to make the
          motion unreadable, which is what happened first time round.
        */}
        {/* Centre line */}
        <line x1="0" y1="712" x2="1200" y2="712" stroke="rgba(255,255,255,0.55)" strokeWidth="5" className="road-line" />
        {/* Kerb ticks, finer and faster — closer to the eye, so more parallax */}
        <line x1="0" y1="762" x2="1200" y2="762" stroke="rgba(255,255,255,0.28)" strokeWidth="3" className="road-kerb" />
        {/* Ground streaks just under the wheels */}
        <line x1="0" y1="662" x2="1200" y2="662" stroke="rgba(255,255,255,0.14)" strokeWidth="2" className="road-kerb" />

        {/* --- Vehicle: outer <g> positions, inner <g> animates --- */}
        <g transform="translate(430 500) scale(1.5)">
          <g className="bike">
            <SportBike />
          </g>
        </g>
      </svg>
    </div>
  );
}

/**
 * One seamless tile of skyline. Heights are irregular on purpose — evenly
 * spaced equal-width bars read as a bar chart, which is exactly what the first
 * attempt looked like.
 */
function Skyline({ offset, scale, seedShift }: { offset: number; scale: number; seedShift?: boolean }) {
  const base: [number, number, number][] = [
    // [x, height, width]
    [0, 120, 54], [58, 190, 38], [100, 96, 66], [170, 150, 42], [216, 82, 50],
    [270, 210, 34], [308, 132, 58], [370, 104, 44], [418, 176, 40], [462, 88, 62],
    [528, 144, 36], [568, 198, 48], [620, 110, 54], [678, 164, 38], [720, 92, 68],
    [792, 136, 42], [838, 182, 34], [876, 100, 58], [938, 154, 46], [988, 86, 52],
    [1044, 168, 40], [1088, 118, 60], [1152, 142, 44],
  ];
  const shift = seedShift ? 26 : 0;
  return (
    <>
      {base.map(([x, h, w], i) => {
        const height = h * scale;
        return (
          <rect key={i} x={offset + x + shift} y={620 - height} width={w} height={height} rx="1.5" />
        );
      })}
    </>
  );
}
