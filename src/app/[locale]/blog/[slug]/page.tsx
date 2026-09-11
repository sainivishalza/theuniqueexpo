import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { renderMarkdown } from "@/lib/markdown";
import { getPublishedPostBySlug } from "@/lib/server/blog-repo";
import Card from "@/components/ui/Card";

// Content only changes via the admin panel -- cache the rendered page and
// revalidate in the background instead of hitting the DB on every request.
export const revalidate = 60;

const SITE_URL = "https://theuniqueexpo.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
      publishedTime: post.publishedAt || undefined,
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.excerpt },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("blogPostPage");
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-heading">{t("notFound")}</h1>
          <Link href="/blog" className="mt-4 inline-block text-emerald-600 hover:underline">{t("browseAll")}</Link>
        </div>
      </div>
    );
  }

  // BlogPosting schema -- readers and AI answer engines both use this to
  // attribute the article to a real author instead of an anonymous page.
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    url: `${SITE_URL}/blog/${post.slug}`,
    ...(post.publishedAt && { datePublished: post.publishedAt }),
    ...(post.coverImage && { image: post.coverImage }),
    ...(post.authorName && { author: { "@type": "Person", name: post.authorName, ...(post.authorBio && { description: post.authorBio }) } }),
  };
  const schemaJson = JSON.stringify(schema).replace(/</g, "\\u003c");

  // Separate FAQPage schema (rather than folding into BlogPosting) since
  // that's the type Google/AI answer engines actually look for Q&A pairs
  // under -- a page can carry more than one JSON-LD script.
  const faqSchemaJson = post.faqItems.length > 0
    ? JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: post.faqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      }).replace(/</g, "\\u003c")
    : null;

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} />
      {faqSchemaJson && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqSchemaJson }} />}

      <section className="bg-[var(--color-hero-bg)] py-12">
        <div className="mx-auto max-w-3xl px-6 text-white">
          <Link href={`/blog?category=${post.category}`} className="text-sm text-emerald-300 hover:underline font-semibold uppercase tracking-wide">
            {t(`categories.${post.category}`)}
          </Link>
          <h1 className="mt-3 text-3xl md:text-4xl font-extrabold leading-tight">{post.title}</h1>
          {post.publishedAt && (
            <p className="mt-3 text-sm text-gray-400">{new Date(post.publishedAt).toLocaleDateString()}</p>
          )}
        </div>
      </section>

      {post.coverImage && (
        <section className="relative bg-gray-950 py-8 overflow-hidden">
          <div className="relative mx-auto max-w-3xl px-6">
            <Image
              src={post.coverImage} alt={post.title} width={1200} height={630}
              sizes="(max-width: 768px) 100vw, 800px"
              className="w-full h-auto rounded-xl shadow-2xl"
              priority
            />
          </div>
        </section>
      )}

      <section className="py-12 bg-cream-50">
        <div className="mx-auto max-w-3xl px-6">
          <Card
            shadow="sm"
            bordered={false}
            className="p-8 text-gray-700"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
          />

          {post.authorName && (
            <Card shadow="sm" bordered={false} className="mt-6 p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-full gradient-brand flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {post.authorName.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t("writtenBy")}</p>
                <p className="font-bold text-gray-900">{post.authorName}</p>
                {post.authorBio && <p className="text-sm text-gray-500 mt-1">{post.authorBio}</p>}
              </div>
            </Card>
          )}

          {post.faqItems.length > 0 && (
            <Card shadow="sm" bordered={false} className="mt-6 p-6">
              <h2 className="font-bold text-heading mb-4">{t("faqTitle")}</h2>
              <div className="space-y-4">
                {post.faqItems.map((item) => (
                  <div key={item.question}>
                    <h3 className="font-semibold text-heading text-sm">{item.question}</h3>
                    <p className="text-sm text-gray-500 mt-1">{item.answer}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Link href="/blog" className="mt-6 inline-block text-sm font-semibold text-emerald-600 hover:underline">
            {t("browseAll")}
          </Link>
        </div>
      </section>
    </div>
  );
}
