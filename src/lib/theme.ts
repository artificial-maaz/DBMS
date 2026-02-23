/**
 * Brand presets (Sir, 2026-08-01 — GUI phase, option A3).
 *
 * Settings offers these five hand-tuned schemes up front, with a free hex
 * picker behind an "Advanced" toggle. Each `hex` is the mid tone; every other
 * shade is derived from it in CSS via color-mix(), so one value themes the
 * entire app in both light and dark mode.
 *
 * Chosen for readability against white AND against the dark surface — a raw
 * picker can produce a colour that fails on one of the two, which is exactly
 * why presets exist.
 */
export type BrandPreset = {
  id: string;
  name: string;
  hex: string;
  blurb: string;
};

export const BRAND_PRESETS: BrandPreset[] = [
  { id: "indigo", name: "Indigo", hex: "#4f46e5", blurb: "Current look — calm, corporate" },
  { id: "emerald", name: "Emerald", hex: "#059669", blurb: "Fresh and money-positive" },
  { id: "royal", name: "Royal Blue", hex: "#2563eb", blurb: "Classic dealership blue" },
  { id: "crimson", name: "Crimson", hex: "#dc2626", blurb: "Bold, high-energy showroom" },
  { id: "graphite", name: "Graphite", hex: "#334155", blurb: "Understated, ink on paper" },
];

export const DEFAULT_BRAND = BRAND_PRESETS[0].hex;

/** Is this hex one of the presets? Drives which swatch shows as selected. */
export function presetFor(hex: string) {
  const normalized = hex.trim().toLowerCase();
  return BRAND_PRESETS.find((p) => p.hex.toLowerCase() === normalized) ?? null;
}
