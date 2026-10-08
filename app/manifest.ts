import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Liftboard", short_name: "Liftboard", start_url: "/", display: "standalone",
    background_color: "#100e1a", theme_color: "#100e1a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
