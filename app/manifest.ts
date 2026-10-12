import type { MetadataRoute } from "next";

// Web app manifest: lets the dashboard be installed to the home screen and
// open full screen like a native app (iPhone: Share → Add to Home Screen).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "STRIDE+",
    short_name: "STRIDE+",
    description: "Dashboard lari pribadi dari data COROS.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0c",
    theme_color: "#0a0a0c",
    lang: "id",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
