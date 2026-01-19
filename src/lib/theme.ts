/**
 * Brand presets (Sir, 2026-08-06 — reworked around blue).
 *
 * Settings offers these up front, with a free hex picker behind "Advanced".
 * Each `hex` is the MID tone; every other shade is derived from it in CSS via
 * color-mix(), so one value themes the whole app in both light and dark.
 *
 * Blues lead because that is the house colour. Each was checked for contrast
 * both as a button fill (white text on `brand-600`) and as a link colour on the
 * dark surface — a raw picker can easily produce something that passes one and
 * fails the other, which is exactly why presets exist.
 */
export type BrandPreset = {
  id: string;
  name: string;
  hex: string;
  blurb: string;
};

export const BRAND_PRESETS: BrandPreset[] = [
  // --- blues ---
  { id: "navy", name: "Navy", hex: "#1b3168", blurb: "Deep and corporate — the default" },
  { id: "royal", name: "Royal Blue", hex: "#2563eb", blurb: "Brighter and more energetic" },
  { id: "midnight", name: "Midnight", hex: "#152a4e", blurb: "Near-black navy; very serious" },
  { id: "azure", name: "Azure", hex: "#0284c7", blurb: "Cooler, tech-forward blue" },
  { id: "steel", name: "Steel Blue", hex: "#3b6ea5", blurb: "Muted and understated" },
  { id: "indigo", name: "Indigo", hex: "#4f46e5", blurb: "Blue leaning violet" },
  // --- alternatives ---
  { id: "emerald", name: "Emerald", hex: "#059669", blurb: "Fresh and money-positive" },
  { id: "crimson", name: "Crimson", hex: "#dc2626", blurb: "Bold, high-energy showroom" },
  { id: "graphite", name: "Graphite", hex: "#334155", blurb: "Understated, ink on paper" },
];

/** Navy — Sir's house colour, deepened 2026-08-06 on his call. */
export const DEFAULT_BRAND = "#1b3168";

/**
 * Values treated as "never chosen" so old installs pick up the real default.
 * ONLY retired defaults belong here — never a colour that is still selectable,
 * or picking it would be silently overridden.
 */
const LEGACY_DEFAULTS = new Set(["#0f172a", "#4f46e5", "#1e3a8a"]);

export function resolveBrand(stored: string | null | undefined) {
  if (!stored) return DEFAULT_BRAND;
  return LEGACY_DEFAULTS.has(stored.toLowerCase()) ? DEFAULT_BRAND : stored;
}

/** Is this hex one of the presets? Drives which swatch shows as selected. */
export function presetFor(hex: string) {
  const normalized = hex.trim().toLowerCase();
  return BRAND_PRESETS.find((p) => p.hex.toLowerCase() === normalized) ?? null;
}
