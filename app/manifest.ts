import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.shortName,
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    lang: "sr-RS",
    icons: [
      { src: "/media/dropz%20png%20logo%20original-01.png", sizes: "any", type: "image/png" },
    ],
  };
}
