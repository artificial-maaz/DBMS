import type { MetadataRoute } from "next";

/**
 * PWA manifest — makes the app installable from the browser.
 * TODO(next chunk): real icons (192/512 px) — required for install prompt.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dealership ERP",
    short_name: "ERP",
    description: "Multi-branch vehicle dealership management",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
    icons: [],
  };
}
