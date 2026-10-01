import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

// Rendered per request so the sitemap host follows the runtime SITE_URL.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/en/admin", "/account", "/en/account", "/payment", "/en/payment", "/api/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
