import type { Metadata, Viewport } from "next";
import { APP_NAME } from "@/lib/config";
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

  return (
    <html lang="en" className={theme === "dark" ? "dark" : undefined}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
