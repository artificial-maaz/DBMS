import type { MetadataRoute } from "next";

/** PWA manifest — makes the app installable from the browser. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dealership ERP",
    short_name: "ERP",
    description: "Multi-branch vehicle dealership management",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
