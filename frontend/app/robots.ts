import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Only the public pages are for search engines; families' books, recordings and share links are private. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/book", "/onboarding", "/record", "/share", "/auth"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
