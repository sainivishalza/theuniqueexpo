import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { renderMarkdown } from "@/lib/markdown";
import { getPublishedPostBySlug } from "@/lib/server/blog-repo";

// Content only changes via the admin panel -- cache the rendered page and
// revalidate in the background instead of hitting the DB on every request.
export const revalidate = 60;

const SITE_URL = "https://www.theuniqueexpo.com";

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
          <h1 className="text-2xl font-bold text-gray-900">{t("notFound")}</h1>
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

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} />

      <section className="bg-gray-900 py-12">
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

      <section className="py-12 bg-gray-50">
        <div className="mx-auto max-w-3xl px-6">
          <div
            className="rounded-2xl bg-white p-8 shadow-sm text-gray-700"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
          />

          {post.authorName && (
            <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-full gradient-brand flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {post.authorName.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t("writtenBy")}</p>
                <p className="font-bold text-gray-900">{post.authorName}</p>
                {post.authorBio && <p className="text-sm text-gray-500 mt-1">{post.authorBio}</p>}
              </div>
            </div>
          )}

          <Link href="/blog" className="mt-6 inline-block text-sm font-semibold text-emerald-600 hover:underline">
            {t("browseAll")}
          </Link>
        </div>
      </section>
    </div>
  );
}
