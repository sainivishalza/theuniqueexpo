import { getTourBySlugOrId } from "@/lib/server/tours-repo";
import TourDetailView, { type Tour } from "./TourDetailView";

// Fetched on the server so the tour's content is in the initial HTML for
// search engines and link previews, same as the exhibition detail page.
export default async function TourDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const row = await getTourBySlugOrId(slug, locale);
  if (!row) return <TourDetailView tour={null} />;

  const tour: Tour = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    dates: row.dates,
    startDate: row.startDate,
    endDate: row.endDate,
    duration: row.duration,
    departureCity: row.departureCity,
    destination: row.destination,
    description: row.description,
    highlights: row.highlights,
    price: row.price,
    currency: row.currency,
    groupSize: row.groupSize,
    organizer: row.organizer,
    color: row.color,
    image: row.image?.startsWith("data:") ? `/api/tours/${row.slug}/image?v=${row.updatedAt}` : row.image,
    galleryImages: row.galleryImages.map((img: string, i: number) =>
      img?.startsWith("data:") ? `/api/tours/${row.slug}/gallery/${i}?v=${row.updatedAt}` : img
    ),
    registrationEnabled: row.registrationEnabled,
  };

  return <TourDetailView tour={tour} />;
}
