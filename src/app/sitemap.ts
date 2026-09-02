import type { MetadataRoute } from "next";
import { listExhibitions } from "@/lib/server/exhibitions-repo";
import { listTours } from "@/lib/server/tours-repo";
import { getAllTours } from "@/lib/tours";
import { mockExhibitorProfiles } from "@/lib/booths";
import { routing } from "@/i18n/routing";

const SITE_URL = "https://theuniqueexpo.com";

const STATIC_ROUTES = [
  "",
  "/exhibitions",
  "/directory",
  "/tours",
  "/marketplace",
  "/about",
  "/contact",
  "/careers",
  "/blog",
  "/help",
  "/exhibition-guide",
  "/booth-setup-tips",
  "/api-documentation",
  "/services",
  "/services/business-tours",
  "/services/china-tours",
  "/services/consultation",
  "/services/visa-setup",
  "/services/moving-assistance",
  "/services/transport-subsidies",
  "/login",
  "/register",
];

// Every page now lives under a /<locale> prefix (see src/i18n/routing.ts) --
// emit one sitemap entry per locale for each path, each carrying hreflang
// alternates pointing at the other locales of the same path.
function localizedEntries(path: string, lastModified: Date): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    routing.locales.map((locale) => [locale, `${SITE_URL}/${locale}${path}`])
  );
  return routing.locales.map((locale) => ({
    url: `${SITE_URL}/${locale}${path}`,
    lastModified,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.flatMap((path) =>
    localizedEntries(path, now)
  );

  let exhibitionEntries: MetadataRoute.Sitemap = [];
  try {
    const exhibitions = await listExhibitions();
    exhibitionEntries = exhibitions.flatMap((expo) =>
      localizedEntries(`/exhibitions/${expo.slug}`, now)
    );
  } catch {
    // Sitemap generation shouldn't take the whole site down if the DB is briefly unreachable.
  }

  const tourEntries: MetadataRoute.Sitemap = getAllTours().flatMap((tour) =>
    localizedEntries(
      `/services/${tour.type === "business" ? "business-tours" : "china-tours"}/${tour.slug}`,
      now
    )
  );

  let dbTourEntries: MetadataRoute.Sitemap = [];
  try {
    const dbTours = await listTours();
    dbTourEntries = dbTours.flatMap((tour) => localizedEntries(`/tours/${tour.slug}`, now));
  } catch {
    // Same reasoning as exhibitions above.
  }

  const exhibitorEntries: MetadataRoute.Sitemap = mockExhibitorProfiles.flatMap((profile) =>
    localizedEntries(`/exhibitor/${profile.slug || profile.id}`, now)
  );

  return [...staticEntries, ...exhibitionEntries, ...tourEntries, ...dbTourEntries, ...exhibitorEntries];
}
