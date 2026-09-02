import type { Metadata } from "next";
import { getTourBySlugOrId } from "@/lib/server/tours-repo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tour = await getTourBySlugOrId(slug);
  if (!tour) {
    return { title: "Tour not found" };
  }

  const description =
    tour.description?.slice(0, 200) ||
    `${tour.title} — ${tour.dates}, ${tour.departureCity} to ${tour.destination}.`;
  const imageUrl = tour.image?.startsWith("data:")
    ? `/api/tours/${tour.slug}/image`
    : tour.image;
  const images = imageUrl ? [{ url: imageUrl }] : undefined;

  return {
    title: tour.title,
    description,
    openGraph: { title: tour.title, description, images },
    twitter: { title: tour.title, description, images },
  };
}

export default function TourDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
