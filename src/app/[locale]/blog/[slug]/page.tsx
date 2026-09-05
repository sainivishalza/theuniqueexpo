"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { renderMarkdown } from "@/lib/markdown";

interface Post {
  id: string; slug: string; category: string; title: string; excerpt: string;
  content: string; coverImage: string; publishedAt: string | null;
}

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations("blogPostPage");
  const { slug } = use(params);
  const [post, setPost] = useState<Post | null | undefined>(undefined);

  useEffect(() => {
    fetch(`/api/blog/${slug}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setPost(data.post))
      .catch(() => setPost(null));
  }, [slug]);

  if (post === undefined) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-400">{t("loading")}</div>;
  }

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

  return (
    <div>
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
          <Link href="/blog" className="mt-6 inline-block text-sm font-semibold text-emerald-600 hover:underline">
            {t("browseAll")}
          </Link>
        </div>
      </section>
    </div>
  );
}
