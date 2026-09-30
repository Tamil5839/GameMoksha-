import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Moksha Patam",
    short_name: "Moksha Patam",
    description: "Your habits as the original Snakes and Ladders.",
    start_url: "/board",
    display: "standalone",
    background_color: "#f5e6c8",
    theme_color: "#f5e6c8",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
