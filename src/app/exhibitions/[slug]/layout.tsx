import type { Metadata } from "next";
import { getExhibitionBySlugOrId } from "@/lib/server/exhibitions-repo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const expo = await getExhibitionBySlugOrId(slug);
  if (!expo) {
    return { title: "Exhibition not found" };
  }

  const description =
    expo.description?.slice(0, 200) ||
    `${expo.title} — ${expo.dates} at ${expo.venue}, ${expo.city}, ${expo.country}.`;
  // og:image crawlers (Facebook/WhatsApp/Twitter) need a fetchable URL, not
  // a data: URI -- route through the dedicated image endpoint for uploaded
  // posters, same as the exhibition list view already does.
  const imageUrl = expo.image?.startsWith("data:")
    ? `/api/exhibitions/${expo.slug}/image`
    : expo.image;
  const images = imageUrl ? [{ url: imageUrl }] : undefined;

  return {
    title: expo.title,
    description,
    openGraph: { title: expo.title, description, images },
    twitter: { title: expo.title, description, images },
  };
}

export default function ExhibitionDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
