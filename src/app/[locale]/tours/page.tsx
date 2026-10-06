import { getLocale } from "next-intl/server";
import { listTours } from "@/lib/server/tours-repo";
import ToursView, { type Tour } from "./ToursView";

// Fetched on the server so the tour cards (and their links to each tour page)
// are in the initial HTML instead of appearing after a client-side fetch.
export default async function ToursPage() {
  const locale = await getLocale();
  const rows = await listTours(locale);
  const tours: Tour[] = rows.map((r) => ({
    id: r.id, slug: r.slug, title: r.title, dates: r.dates, startDate: r.startDate, endDate: r.endDate,
    duration: r.duration, departureCity: r.departureCity, destination: r.destination, description: r.description,
    price: String(r.price), currency: r.currency, groupSize: String(r.groupSize), color: r.color, image: r.image,
  }));
  return <ToursView tours={tours} />;
}
