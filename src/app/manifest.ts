import type { MetadataRoute } from "next";
import { APP_NAME, APP_SHORT_NAME } from "@/lib/config";

/**
 * PWA manifest — makes the app installable from the browser.
 *
 * `theme_color` is the navy brand default, not the old near-black `#0f172a`.
 * On Android that colour paints the status bar of the installed app, so the
 * wrong value showed a black bar above a navy app. It cannot read System
 * Settings (the manifest is generated without a request context), which is why
 * this is the brand DEFAULT rather than the stored theme colour — if Sir picks
 * a different brand colour later, this line is the one to update.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: "Multi-branch vehicle dealership management",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6fa",
    theme_color: "#1b3168",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
