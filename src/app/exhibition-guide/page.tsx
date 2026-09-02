import type { Metadata } from "next";
import { getSitePage } from "@/lib/server/site-pages-repo";
import SitePageView from "@/components/SitePageView";

// Content only changes via the admin panel -- cache the rendered page and
// revalidate in the background instead of hitting the DB on every request.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSitePage("exhibition-guide");
  return { title: content.heading, description: content.tagline };
}

export default async function ExhibitionGuidePage() {
  const content = await getSitePage("exhibition-guide");
  return <SitePageView content={content} />;
}
