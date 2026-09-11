import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getIssueByNumber, getIssueArticles } from "@/lib/server/magazine-repo";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ issueNumber: string }> }): Promise<Metadata> {
  const { issueNumber } = await params;
  const issue = await getIssueByNumber(Number(issueNumber));
  if (!issue) return {};
  return { title: issue.title, description: issue.intro };
}

export default async function MagazineIssuePage({ params }: { params: Promise<{ issueNumber: string }> }) {
  const t = await getTranslations("magazinePage");
  const { issueNumber } = await params;
  const issue = await getIssueByNumber(Number(issueNumber));
  if (!issue) notFound();

  const articles = await getIssueArticles(issue.blogPostIds);

  return (
    <div>
      <section className="bg-[var(--color-hero-bg)] py-16">
        <div className="mx-auto max-w-4xl px-6 text-white">
          <Link href="/magazine" className="text-sm text-gray-300 hover:text-white mb-4 inline-block">{t("backToMagazine")}</Link>
          <Badge tone="gold" size="tag" className="mb-3">{t("issueLabel", { number: issue.issueNumber })}</Badge>
          <h1 className="text-3xl md:text-5xl font-extrabold">{issue.title}</h1>
          <p className="mt-4 text-lg text-gray-300 max-w-2xl">{issue.intro}</p>
        </div>
      </section>

      {issue.coverImage && (
        <section className="relative bg-gray-950 py-8 overflow-hidden">
          <div className="relative mx-auto max-w-4xl px-6 flex justify-center">
            <Image src={issue.coverImage} alt={issue.title} width={1200} height={800} sizes="(max-width: 768px) 100vw, 800px" className="max-w-full max-h-[50vh] w-auto h-auto rounded-xl shadow-2xl" priority />
          </div>
        </section>
      )}

      <section className="py-14 bg-cream-50">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-xl font-bold text-heading mb-6">{t("inThisIssue")}</h2>
          {articles.length === 0 ? (
            <p className="text-gray-500">{t("noArticlesYet")}</p>
          ) : (
            <div className="space-y-4">
              {articles.map((article) => (
                <Card key={article.id} href={`/blog/${article.slug}`} shadow="sm" bordered={false} hoverable className="p-6 flex gap-4 items-start">
                  {article.coverImage && (
                    <div className="relative w-28 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 hidden sm:block">
                      <Image src={article.coverImage} alt={article.title} fill sizes="112px" className="object-cover" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-bold text-heading">{article.title}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{article.excerpt}</p>
                    {article.authorName && <p className="text-xs text-gray-400 mt-2">{article.authorName}</p>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
