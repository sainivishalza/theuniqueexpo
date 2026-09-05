"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";

interface Post {
  id: string; slug: string; category: string; title: string; excerpt: string;
  coverImage: string; publishedAt: string | null;
}

const CATEGORIES = ["life-in-china", "relocation-tips", "exhibition-reviews"] as const;

export default function BlogPage() {
  const t = useTranslations("blogPage");
  const searchParams = useSearchParams();
  const category = searchParams.get("category") || "";
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/blog${category ? `?category=${category}` : ""}`)
      .then((res) => res.json())
      .then((data) => setPosts(data.posts || []))
      .finally(() => setLoading(false));
  }, [category]);

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

          {loading && <p className="text-center py-20 text-gray-400">{t("loading")}</p>}

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

          {!loading && posts.length === 0 && (
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
