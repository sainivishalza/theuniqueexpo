import { getExhibitionBySlugOrId } from "@/lib/server/exhibitions-repo";
import ExhibitionDetailView, { type Exhibition } from "./ExhibitionDetailView";

// Fetched on the server so the exhibition's title, dates and description are
// in the initial HTML -- search engines and link previews see the content
// without running JavaScript.
export default async function ExhibitionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const row = await getExhibitionBySlugOrId(slug, locale);
  if (!row) return <ExhibitionDetailView expo={null} />;

  // Uploaded posters/gallery photos are stored as base64 data: URLs; route
  // them through the image endpoints (with updatedAt as a cache-buster)
  // rather than embedding multi-hundred-KB strings in the page.
  const expo: Exhibition = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    dates: row.dates,
    startDate: row.startDate,
    endDate: row.endDate,
    venue: row.venue,
    city: row.city,
    country: row.country,
    industry: row.industry,
    description: row.description,
    highlights: row.highlights,
    exhibitors: row.exhibitors,
    visitors: row.visitors,
    organizer: row.organizer,
    website: row.website,
    color: row.color,
    image: row.image?.startsWith("data:") ? `/api/exhibitions/${row.slug}/image?v=${row.updatedAt}` : row.image,
    galleryImages: row.galleryImages.map((img: string, i: number) =>
      img?.startsWith("data:") ? `/api/exhibitions/${row.slug}/gallery/${i}?v=${row.updatedAt}` : img
    ),
    registrationEnabled: row.registrationEnabled,
  };

  return <ExhibitionDetailView expo={expo} />;
}
