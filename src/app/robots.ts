import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const SITE_URL = "https://theuniqueexpo.com";

export default function robots(): MetadataRoute.Robots {
  // Every page lives under a /<locale> prefix (see src/i18n/routing.ts),
  // so admin/dashboard/api must be disallowed per-locale too, not just at
  // the unprefixed path.
  const disallow = routing.locales.flatMap((locale) => [
    `/${locale}/admin`,
    `/${locale}/dashboard`,
  ]);
  disallow.push("/api");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
