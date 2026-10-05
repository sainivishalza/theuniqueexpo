import type { Metadata } from "next";
import { getSitePage } from "@/lib/server/site-pages-repo";
import SitePageView from "@/components/SitePageView";
import { getLocale, getTranslations } from "next-intl/server";
import { metaDescription } from "@/lib/seo";

// Content only changes via the admin panel -- cache the rendered page and
// revalidate in the background instead of hitting the DB on every request.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const content = await getSitePage("privacy-policy", locale);
  const siteTail = (await getTranslations("meta"))("siteTail");
  return { title: content.heading, description: metaDescription(content.tagline, siteTail) };
}

export default async function PrivacyPolicyPage() {
  const locale = await getLocale();
  const content = await getSitePage("privacy-policy", locale);
  return <SitePageView content={content} />;
}
