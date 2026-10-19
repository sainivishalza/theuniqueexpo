import type { Metadata } from "next";
import { getTourBySlugOrId } from "@/lib/server/tours-repo";
import { getTranslations } from "next-intl/server";
import { metaDescription } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const tour = await getTourBySlugOrId(slug, locale);
  const t = await getTranslations({ locale, namespace: "meta" });
  if (!tour) {
    return { title: t("tourNotFound") };
  }

  const description = metaDescription(
    tour.description,
    t("tourSummary", { title: tour.title, dates: tour.dates, departureCity: tour.departureCity, destination: tour.destination })
  );
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
