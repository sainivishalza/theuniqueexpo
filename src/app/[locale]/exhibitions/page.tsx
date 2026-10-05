import { listExhibitions } from "@/lib/server/exhibitions-repo";
import ExhibitionsView, { type Exhibition } from "./ExhibitionsView";

// Fetched on the server so every exhibition is in the initial HTML for
// search engines, rather than loaded by the browser after the page renders.
export default async function ExhibitionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const [{ locale }, { view }] = await Promise.all([params, searchParams]);
  const rows = await listExhibitions(locale);
  const exhibitions: Exhibition[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    dates: r.dates,
    startDate: r.startDate,
    endDate: r.endDate,
    venue: r.venue,
    city: r.city,
    country: r.country,
    industry: r.industry,
    description: r.description,
    highlights: r.highlights,
    exhibitors: r.exhibitors,
    visitors: r.visitors,
    organizer: r.organizer,
    website: r.website,
    color: r.color,
    image: r.image,
    registrationEnabled: r.registrationEnabled,
  }));
  return <ExhibitionsView exhibitions={exhibitions} initialView={view ?? null} />;
}
