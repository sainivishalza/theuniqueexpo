import type { MetadataRoute } from "next";

// Lets a phone offer "Add to home screen" for the site (buyers keep their wallet QR and registrations one tap away).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Unique Expo",
    short_name: "Unique Expo",
    description: "Exhibitions, business tours and B2B services in China.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fefdfb",
    theme_color: "#075b4f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
