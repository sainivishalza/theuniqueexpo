import type { MetadataRoute } from "next";
import { listExhibitions } from "@/lib/server/exhibitions-repo";
import { listTours } from "@/lib/server/tours-repo";
import { listEvents } from "@/lib/server/events-repo";
import { listPublishedPosts } from "@/lib/server/blog-repo";
import { getAllToursData } from "@/lib/tours";
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
  "/events",
  "/relocation",
  "/help",
  "/exhibition-guide",
  "/booth-setup-tips",
  "/api-documentation",
  "/privacy",
  "/terms",
  "/cookies",
  "/services",
  "/services/business-tours",
  "/services/china-tours",
  "/services/consultation",
  "/services/visa-setup",
  "/services/moving-assistance",
  "/services/relocation-cost-estimator",
  "/services/transport-subsidies",
  "/services/conference-forum-hosting",
  "/business-tours",
  "/china-travel",
  "/city-partnerships",
  "/magazine",
  "/videos",
  "/partner-program",
  "/partner-with-us",
  "/plan-business-trip",
  "/login",
  "/register",
];

// Every page now lives under a /<locale> prefix (see src/i18n/routing.ts) --
// emit one sitemap entry per locale for each path, each carrying hreflang
// alternates pointing at the other locales of the same path.
function localizedEntries(path: string, lastModified?: Date): MetadataRoute.Sitemap {
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
  // lastModified is only emitted where we know a real date -- stamping every URL
  // with "now" teaches Google to ignore the field.
  const fromEpoch = (seconds: number) => (seconds ? new Date(seconds * 1000) : undefined);
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.flatMap((path) =>
    localizedEntries(path)
  );

  let exhibitionEntries: MetadataRoute.Sitemap = [];
  try {
    const exhibitions = await listExhibitions();
    exhibitionEntries = exhibitions.flatMap((expo) =>
      localizedEntries(`/exhibitions/${expo.slug}`, fromEpoch(expo.updatedAt))
    );
  } catch {
    // Sitemap generation shouldn't take the whole site down if the DB is briefly unreachable.
  }

  const tourEntries: MetadataRoute.Sitemap = getAllToursData().flatMap((tour) =>
    localizedEntries(
      `/services/${tour.type === "business" ? "business-tours" : "china-tours"}/${tour.slug}`
    )
  );

  let dbTourEntries: MetadataRoute.Sitemap = [];
  try {
    const dbTours = await listTours();
    dbTourEntries = dbTours.flatMap((tour) => localizedEntries(`/tours/${tour.slug}`, fromEpoch(tour.updatedAt)));
  } catch {
    // Same reasoning as exhibitions above.
  }

  const exhibitorEntries: MetadataRoute.Sitemap = mockExhibitorProfiles.flatMap((profile) =>
    localizedEntries(`/exhibitor/${profile.slug || profile.id}`)
  );

  let eventEntries: MetadataRoute.Sitemap = [];
  try {
    const events = await listEvents();
    eventEntries = events.flatMap((event) => localizedEntries(`/events/${event.slug}`));
  } catch {
    // Same reasoning as exhibitions above.
  }

  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const posts = await listPublishedPosts();
    blogEntries = posts.flatMap((post) => localizedEntries(`/blog/${post.slug}`, post.publishedAt ? new Date(post.publishedAt) : undefined));
  } catch {
    // Same reasoning as exhibitions above.
  }

  return [
    ...staticEntries, ...exhibitionEntries, ...tourEntries, ...dbTourEntries,
    ...exhibitorEntries, ...eventEntries, ...blogEntries,
  ];
}
