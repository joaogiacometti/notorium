import type { MetadataRoute } from "next";
import { defaultThemeChromeColor } from "@/lib/theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Notorium",
    short_name: "Notorium",
    description: "Study management system",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: defaultThemeChromeColor,
    theme_color: defaultThemeChromeColor,
    icons: [
      {
        src: "/icons/notorium-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/notorium-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
