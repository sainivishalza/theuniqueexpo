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
  const content = await getSitePage("help-center", locale);
  const siteTail = (await getTranslations("meta"))("siteTail");
  return { title: content.heading, description: metaDescription(content.tagline, siteTail) };
}

export default async function HelpCenterPage() {
  const locale = await getLocale();
  const content = await getSitePage("help-center", locale);
  // The Help Center items are question/answer pairs -- expose them as FAQPage
  // structured data so they can appear as rich results.
  const faqJson = content.items.length > 0
    ? JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: content.items.map((item) => ({
          "@type": "Question",
          name: item.title,
          acceptedAnswer: { "@type": "Answer", text: item.description },
        })),
      }).replace(/</g, "\\u003c")
    : null;
  return (
    <>
      {faqJson && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJson }} />}
      <SitePageView content={content} />
    </>
  );
}
