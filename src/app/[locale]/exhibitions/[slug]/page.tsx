import { getExhibitionBySlugOrId } from "@/lib/server/exhibitions-repo";
import ExhibitionDetailView, { type Exhibition } from "./ExhibitionDetailView";
import { SITE_URL, metaDescription } from "@/lib/seo";

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

  // Event structured data so Google can show the dates and venue directly in
  // search results. Only emitted when there's a real start date.
  let schemaJson: string | null = null;
  if (expo.startDate) {
    const image = expo.image ? new URL(expo.image, SITE_URL).toString() : undefined;
    const schema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Event",
      name: expo.title,
      startDate: expo.startDate,
      ...(expo.endDate && { endDate: expo.endDate }),
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      description: metaDescription(expo.description, `${expo.title} — ${expo.dates}.`),
      url: `${SITE_URL}/${locale}/exhibitions/${expo.slug}`,
      ...(image && { image }),
      ...((expo.venue || expo.city || expo.country) && {
        location: {
          "@type": "Place",
          name: expo.venue || expo.city || expo.country,
          address: {
            "@type": "PostalAddress",
            ...(expo.city && { addressLocality: expo.city }),
            ...(expo.country && { addressCountry: expo.country }),
          },
        },
      }),
      ...(expo.organizer && { organizer: { "@type": "Organization", name: expo.organizer, ...(expo.website && { url: expo.website }) } }),
    };
    // Escape "<" so admin-entered text can never close the script tag early.
    schemaJson = JSON.stringify(schema).replace(/</g, "\\u003c");
  }

  return (
    <>
      {schemaJson && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} />}
      <ExhibitionDetailView expo={expo} />
    </>
  );
}
