import type { MetadataRoute } from "next";
import { SAMPLE_SLUGS } from "@/lib/sample-books";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/signup`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
    ...SAMPLE_SLUGS.map((slug) => ({ url: `${SITE_URL}/stories/${slug}`, changeFrequency: "yearly" as const, priority: 0.5 })),
  ];
}
