import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listPublishedPosts, type BlogCategory } from "@/lib/server/blog-repo";

// Content only changes via the admin panel -- cache the rendered page and
// revalidate in the background instead of hitting the DB on every request.
export const revalidate = 60;

const CATEGORIES: BlogCategory[] = ["life-in-china", "relocation-tips", "exhibition-reviews"];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("blogPage");
  return { title: t("title"), description: t("subtitle") };
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const t = await getTranslations("blogPage");
  const { category: categoryParam } = await searchParams;
  const category = CATEGORIES.includes(categoryParam as BlogCategory) ? (categoryParam as BlogCategory) : undefined;
  const posts = await listPublishedPosts(category);

  return (
    <div>
      <section className="bg-gray-900 py-16">
        <div className="mx-auto max-w-7xl px-6 text-white">
          <h1 className="text-4xl md:text-5xl font-extrabold">{t("title")}</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-xl">{t("subtitle")}</p>
        </div>
      </section>

      <section className="py-12 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap gap-2 mb-8">
            <Link
              href="/blog"
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${!category ? "gradient-brand text-white shadow-md shadow-emerald-500/25" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"}`}
            >
              {t("allPosts")}
            </Link>
            {CATEGORIES.map((c) => (
              <Link
                key={c}
                href={`/blog?category=${c}`}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${category === c ? "gradient-brand text-white shadow-md shadow-emerald-500/25" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"}`}
              >
                {t(`categories.${c}`)}
              </Link>
            ))}
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group block rounded-2xl overflow-hidden bg-white shadow-md shadow-gray-200/50 card-hover"
              >
                <div className="relative h-44 overflow-hidden bg-gray-900 flex items-center justify-center">
                  {post.coverImage ? (
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <span className="text-5xl">📝</span>
                  )}
                </div>
                <div className="p-5">
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">{t(`categories.${post.category}`)}</span>
                  <h3 className="text-lg font-bold text-gray-900 mt-1 mb-2 line-clamp-2">{post.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-3">{post.excerpt}</p>
                  {post.publishedAt && (
                    <p className="text-xs text-gray-400 mt-3">{new Date(post.publishedAt).toLocaleDateString()}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {posts.length === 0 && (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t("noResultsTitle")}</h3>
              <p className="text-gray-500">{t("noResultsSubtitle")}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
