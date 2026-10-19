import type { MetadataRoute } from "next";

/** Lets families add Baithak to their phone's home screen, with its own name, colours and icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Yaadon ki Baithak",
    short_name: "Baithak",
    description: "Hudhud listens to your grandparents and turns their stories into illustrated family storybooks.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a24",
    theme_color: "#12133a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
