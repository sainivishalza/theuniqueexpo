import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listPublishedIssues } from "@/lib/server/magazine-repo";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

// Content only changes via the admin panel -- cache the rendered page and
// revalidate in the background instead of hitting the DB on every request.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("magazinePage");
  return { title: t("title"), description: t("subtitle") };
}

export default async function MagazinePage() {
  const t = await getTranslations("magazinePage");
  const issues = await listPublishedIssues();

  return (
    <div>
      <section className="bg-[var(--color-hero-bg)] py-16">
        <div className="mx-auto max-w-7xl px-6 text-white">
          <Badge tone="outline-light" size="pill" className="mb-4">{t("eyebrow")}</Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold">{t("title")}</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-xl">{t("subtitle")}</p>
        </div>
      </section>

      <section className="py-14 bg-cream-50">
        <div className="mx-auto max-w-6xl px-6">
          {issues.length === 0 ? (
            <p className="text-center text-gray-500 py-16">{t("noIssuesYet")}</p>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {issues.map((issue) => (
                <Card key={issue.id} href={`/magazine/${issue.issueNumber}`} shadow="md" bordered={false} hoverable className="overflow-hidden flex flex-col">
                  <div className="relative aspect-[4/3] bg-gray-900">
                    {issue.coverImage && (
                      <Image src={issue.coverImage} alt={issue.title} fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover" />
                    )}
                    <Badge tone="gold" size="tag" className="absolute top-3 left-3">{t("issueLabel", { number: issue.issueNumber })}</Badge>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h2 className="text-lg font-bold text-heading mb-2">{issue.title}</h2>
                    <p className="text-sm text-gray-500 line-clamp-3 flex-1">{issue.intro}</p>
                    <span className="mt-4 text-sm font-semibold text-emerald-600">{t("readIssue")} &rarr;</span>
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
