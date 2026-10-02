import type { MetadataRoute } from "next";

/** Web app manifest: install name, brand colours and the mandala icons. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EtnoJourney",
    short_name: "EtnoJourney",
    description: "Cultural journeys across Indonesia, guided by local communities.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf8f3",
    theme_color: "#7a654f",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
