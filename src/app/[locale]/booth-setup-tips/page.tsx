import type { Metadata } from "next";
import { getSitePage } from "@/lib/server/site-pages-repo";
import SitePageView from "@/components/SitePageView";
import { getTranslations } from "next-intl/server";
import { metaDescription } from "@/lib/seo";

// Content only changes via the admin panel -- cache the rendered page and
// revalidate in the background instead of hitting the DB on every request.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSitePage("booth-setup-tips");
  const siteTail = (await getTranslations("meta"))("siteTail");
  return { title: content.heading, description: metaDescription(content.tagline, siteTail) };
}

export default async function BoothSetupTipsPage() {
  const content = await getSitePage("booth-setup-tips");
  return <SitePageView content={content} />;
}
