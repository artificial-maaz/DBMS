"use client";

import { useState } from "react";
import { BRAND_PRESETS, presetFor } from "@/lib/theme";

/**
 * Brand colour picker (Sir's option A3, 2026-08-01): five safe presets up
 * front, free hex behind Advanced.
 *
 * Selecting a swatch repaints the app INSTANTLY by writing --brand onto
 * <html> — the same variable the server injects — so you see the real result
 * before saving instead of guessing from a colour chip. Navigating away
 * without saving simply restores the stored value on next render.
 */
export function BrandPicker({ value }: { value: string }) {
  const [hex, setHex] = useState(value);
  const [advanced, setAdvanced] = useState(!presetFor(value));

  function apply(next: string) {
    setHex(next);
    if (/^#[0-9a-fA-F]{6}$/.test(next)) {
      document.documentElement.style.setProperty("--brand", next);
    }
  }

  return (
    <div className="sm:col-span-2 lg:col-span-3">
      <span className="mb-2 block text-sm font-medium">Brand Colour *</span>

      <div className="flex flex-wrap gap-2.5">
        {BRAND_PRESETS.map((p) => {
          const active = p.hex.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => apply(p.hex)}
              title={p.blurb}
              className={`group flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition ${
                active
                  ? "border-brand-500 bg-brand-50 font-medium text-brand-700 shadow-sm"
                  : "border-line hover:border-brand-300 hover:bg-brand-50/50"
              }`}
            >
              <span
                className="h-5 w-5 rounded-full ring-1 ring-black/10 transition group-hover:scale-110"
                style={{ backgroundColor: p.hex }}
              />
              {p.name}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setAdvanced((v) => !v)}
        className="mt-3 text-xs text-ink-faint underline-offset-2 hover:text-brand-600 hover:underline"
      >
        {advanced ? "Hide advanced" : "Advanced — pick a custom colour"}
      </button>

      {advanced && (
        <div className="animate-rise mt-2 flex items-center gap-2">
          <input
            type="color"
            value={hex}
            onChange={(e) => apply(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded border border-line"
          />
          <input
            value={hex}
            onChange={(e) => apply(e.target.value)}
            className="w-32 rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm"
          />
          <span className="text-xs text-ink-faint">
            Lighter and darker shades are generated automatically. Check it in dark mode before saving.
          </span>
        </div>
      )}

      {/* The value the form actually submits. */}
      <input type="hidden" name="themeColor" value={hex} />
    </div>
  );
}
