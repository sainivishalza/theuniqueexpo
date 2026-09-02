import type { MetadataRoute } from "next";
import { listExhibitions } from "@/lib/server/exhibitions-repo";
import { listTours } from "@/lib/server/tours-repo";
import { getAllTours } from "@/lib/tours";
import { mockExhibitorProfiles } from "@/lib/booths";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
  }));

  let exhibitionEntries: MetadataRoute.Sitemap = [];
  try {
    const exhibitions = await listExhibitions();
    exhibitionEntries = exhibitions.map((expo) => ({
      url: `${SITE_URL}/exhibitions/${expo.slug}`,
      lastModified: new Date(),
    }));
  } catch {
    // Sitemap generation shouldn't take the whole site down if the DB is briefly unreachable.
  }

  const tourEntries: MetadataRoute.Sitemap = getAllTours().map((tour) => ({
    url: `${SITE_URL}/services/${tour.type === "business" ? "business-tours" : "china-tours"}/${tour.slug}`,
    lastModified: new Date(),
  }));

  let dbTourEntries: MetadataRoute.Sitemap = [];
  try {
    const dbTours = await listTours();
    dbTourEntries = dbTours.map((tour) => ({
      url: `${SITE_URL}/tours/${tour.slug}`,
      lastModified: new Date(),
    }));
  } catch {
    // Same reasoning as exhibitions above.
  }

  const exhibitorEntries: MetadataRoute.Sitemap = mockExhibitorProfiles.map((profile) => ({
    url: `${SITE_URL}/exhibitor/${profile.slug || profile.id}`,
    lastModified: new Date(),
  }));

  return [...staticEntries, ...exhibitionEntries, ...tourEntries, ...dbTourEntries, ...exhibitorEntries];
}
