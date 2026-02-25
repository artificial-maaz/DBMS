import type { Metadata, Viewport } from "next";
import { APP_NAME } from "@/lib/config";
import { DEFAULT_BRAND } from "@/lib/theme";
import "./globals.css";

/** #29: browser tab title comes from System Settings (config.ts is the fallback). */
export async function generateMetadata(): Promise<Metadata> {
  let title = APP_NAME;
  try {
    const { getSettings } = await import("@/modules/settings/service");
    title = (await getSettings()).browserTitle;
  } catch {
    // DB unreachable (e.g. first boot before migration) — fall back to config
  }
  return {
    title,
    description: "Multi-branch vehicle dealership management system",
    manifest: "/manifest.webmanifest",
  };
}

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Theme cookie read on the server → correct theme on first paint, no flash.
  const { cookies } = await import("next/headers");
  const theme = (await cookies()).get("theme")?.value;

  /**
   * GUI phase (2026-08-01): the Settings theme colour is injected here as a
   * single CSS variable. globals.css derives the whole brand scale from it via
   * color-mix(), so one hex re-themes every screen in both light and dark —
   * server-rendered, so there is no flash of the wrong colour on load.
   */
  let brand = DEFAULT_BRAND;
  try {
    const { getSettings } = await import("@/modules/settings/service");
    const stored = (await getSettings()).themeColor;
    // #0f172a was the pre-GUI default (near-black). Treating it as "never
    // chosen" means existing installs get a real brand colour instead of
    // black-on-black cards until Sir picks one.
    brand = !stored || stored.toLowerCase() === "#0f172a" ? DEFAULT_BRAND : stored;
  } catch {
    // DB unreachable on first boot — the CSS default stands.
  }

  return (
    <html
      lang="en"
      className={theme === "dark" ? "dark" : undefined}
      style={{ ["--brand" as string]: brand }}
    >
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
