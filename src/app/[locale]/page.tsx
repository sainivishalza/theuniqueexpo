import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lib/format";
import FavoriteButton from "@/components/FavoriteButton";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { listExhibitions } from "@/lib/server/exhibitions-repo";
import { getFaqItems } from "@/lib/server/faq-content-repo";
import { listTeamMembers } from "@/lib/server/team-members-repo";
import { listSlideshowPhotos } from "@/lib/server/homepage-slideshow-repo";
import HomepageSlideshow from "@/components/HomepageSlideshow";
import FaqAccordion from "@/components/FaqAccordion";

// How many of the soonest upcoming exhibitions to feature on the homepage.
const FEATURED_COUNT = 6;

// Content only changes via the admin panel -- cache the rendered page and
// revalidate in the background instead of hitting the DB on every request.
export const revalidate = 60;

const INDUSTRY_KEYS = [
  { key: "electronics", icon: "🔌", count: 200 },
  { key: "digitalTrade", icon: "💻", count: 120 },
  { key: "lighting", icon: "💡", count: 75 },
  { key: "furniture", icon: "🪑", count: 90 },
  { key: "manufacturing", icon: "🏭", count: 110 },
  { key: "energy", icon: "⚡", count: 80 },
  { key: "tradeInvestment", icon: "🤝", count: 150 },
  { key: "healthBeauty", icon: "💄", count: 65 },
  { key: "logistics", icon: "📦", count: 60 },
  { key: "hospitality", icon: "🏨", count: 70 },
  { key: "toysGifts", icon: "🧸", count: 65 },
  { key: "agriculture", icon: "🚜", count: 55 },
];

export default async function Home() {
  // getFaqItems() doesn't depend on locale/translations, so it doesn't need
  // to wait behind them -- exhibitions still has to wait for locale to
  // resolve first since it's an input to the query.
  const [t, locale, faqItems, teamMembers, slideshowPhotos] = await Promise.all([
    getTranslations("home"),
    getLocale(),
    getFaqItems(),
    listTeamMembers(),
    listSlideshowPhotos(),
  ]);
  const exhibitions = await listExhibitions(locale);
  const featured = exhibitions.slice(0, FEATURED_COUNT);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  const faqSchemaJson = JSON.stringify(faqSchema).replace(/</g, "\\u003c");

  const stats = [
    { value: "20+", label: t("stats.exhibitions") },
    { value: "15,000+", label: t("stats.exhibitors") },
    { value: "500K+", label: t("stats.visitors") },
    { value: "15+", label: t("stats.markets") },
  ];

  const industries = INDUSTRY_KEYS.map((ind) => ({
    ...ind,
    name: t(`industries.${ind.key}`),
  }));

  return (
    <main>
      <HomepageSlideshow photos={slideshowPhotos} />

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden bg-[var(--color-hero-bg)] min-h-[85vh] flex items-center">
        <div className="absolute inset-0 opacity-30">
          <Image
            src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&h=900&fit=crop&q=80"
            alt=""
            fill
            priority
            fetchPriority="high"
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-hero-bg)] via-[var(--color-hero-bg)]/85 to-[var(--color-hero-bg)]/40" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 text-white w-full">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-8 text-xs font-semibold uppercase tracking-[0.15em] text-gold-400">
              <span className="h-px w-8 bg-gold-400" />
              {t("badge", { count: exhibitions.length })}
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight">
              {t("heroTitleLine1")}
              <br />
              {t("heroTitleLine2")}
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-300 max-w-xl leading-relaxed">
              {t("heroSubtitle")}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button href="/exhibitions" variant="primary">
                {t("browseExhibitions")}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Button>
              <Button href="/services" variant="outline">
                {t("ourServices")}
              </Button>
            </div>
          </div>

          {/* Stats bar -- financial-report style: a thin top rule, a large
              serif figure, a small tracked-out label. No cards, no icons. */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="border-t border-white/20 pt-4">
                <div className="text-4xl md:text-5xl font-extrabold font-[family-name:var(--font-heading)]">{stat.value}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.1em] text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Events Banner — Full Detail Cards ── */}
      <section className="py-20 bg-cream-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 mb-4">{t("featuredBadge")}</p>
            <h2 className="font-[family-name:var(--font-heading)] text-4xl font-bold text-heading">
              {t("featuredTitle")}
            </h2>
            <p className="mt-3 text-lg text-gray-500 max-w-2xl mx-auto">
              {t("featuredSubtitle")}
            </p>
          </div>

          {/* Event Cards — Poster-Style Layout. Pulls straight from the same
              admin-editable exhibitions as /exhibitions and the detail
              pages, so editing one in the admin panel updates everywhere
              at once instead of drifting out of sync. */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((evt) => (
              <Card key={evt.id} href={`/exhibitions/${evt.slug}`} shadow="sm">
                {/* Image, with the date as a small amber tag over it */}
                {evt.image && (
                  <div className="relative h-44 overflow-hidden border-b border-gray-100">
                    <FavoriteButton exhibitionId={evt.id} className="absolute top-3 right-3 z-10 w-9 h-9 text-lg shadow-sm" />
                    <span className="absolute top-3 left-3 z-10 bg-gold-500 text-emerald-950 text-xs font-bold uppercase tracking-[0.08em] px-2.5 py-1">
                      {evt.dates.split(",")[0]}
                    </span>
                    <Image
                      src={evt.image}
                      alt={evt.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}

                <div className="p-5">
                  <h3 className="text-xl font-extrabold leading-tight text-heading">{evt.title}</h3>
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {evt.venue}, {evt.city}
                  </div>

                  <ul className="mt-4 space-y-1.5 mb-4">
                    {evt.highlights.slice(0, 3).map((h) => (
                      <li key={h} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-gold-600 mt-1 shrink-0 text-[10px]">●</span>
                        {h}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-xs text-gray-500">{formatNumber(evt.exhibitors)}{t("exhibitorsSuffix")}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-900 group-hover:text-gold-600 transition-colors">
                      {t("viewDetails")}
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button href="/exhibitions" variant="dark" size="sm">
              {t("viewAll", { count: exhibitions.length })}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Industry Categories ── */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 mb-4">{t("industryBadge")}</p>
            <h2 className="font-[family-name:var(--font-heading)] text-4xl font-bold text-heading">
              {t("industryTitle")}
            </h2>
            <p className="mt-3 text-lg text-gray-500">
              {t("industrySubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {industries.map((ind) => (
              <Link
                key={ind.name}
                href={`/exhibitions?industry=${encodeURIComponent(ind.name)}`}
                className="group rounded-[var(--radius-card)] p-6 text-center border border-gray-200 hover:border-emerald-800 transition-colors"
              >
                <div className="text-4xl mb-3 grayscale group-hover:grayscale-0 transition-[filter] duration-300">{ind.icon}</div>
                <div className="text-sm font-bold text-gray-900">{ind.name}</div>
                <div className="text-xs text-gray-500 mt-1">{ind.count}+ events</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 bg-cream-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 mb-4">{t("processBadge")}</p>
            <h2 className="font-[family-name:var(--font-heading)] text-4xl font-bold text-heading">
              {t("processTitle")}
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: "01", key: "discover" as const },
              { step: "02", key: "registerBuyer" as const },
              { step: "03", key: "connect" as const },
            ].map((item) => (
              <div key={item.step} className="relative rounded-[var(--radius-card)] bg-white p-8 border border-gray-200">
                <div className="font-[family-name:var(--font-heading)] text-6xl font-bold text-gray-200 leading-none mb-4">{item.step}</div>
                <h3 className="text-xl font-bold text-heading mb-3">{t(`steps.${item.key}.title`)}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{t(`steps.${item.key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team Section ── */}
      {teamMembers.length > 0 && (
        <section className="py-20 bg-white">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 mb-4">{t("teamBadge")}</p>
              <h2 className="font-[family-name:var(--font-heading)] text-4xl font-bold text-heading">{t("teamTitle")}</h2>
              <p className="mt-3 text-gray-500 max-w-xl mx-auto">{t("teamSubtitle")}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {teamMembers.map((member) => (
                <div key={member.id} className="text-center">
                  <div className="mx-auto aspect-square w-full max-w-[180px] overflow-hidden bg-gray-100 rounded-[var(--radius-card)] border border-gray-200">
                    {member.photo && (
                      <Image
                        src={member.photo}
                        alt={member.name}
                        width={224}
                        height={224}
                        className="w-full h-full object-cover grayscale"
                      />
                    )}
                  </div>
                  <h3 className="mt-4 font-[family-name:var(--font-heading)] font-bold text-heading">{member.name}</h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">{member.role}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Button href="/about#team" variant="secondaryOutline" size="wide">
                {t("meetTheTeam")}
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ Section ── */}
      {faqItems.length > 0 && (
        <section className="py-20 bg-white">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqSchemaJson }} />
          <div className="mx-auto max-w-3xl px-6">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 mb-4">{t("faqBadge")}</p>
              <h2 className="font-[family-name:var(--font-heading)] text-4xl font-bold text-heading">{t("faqTitle")}</h2>
            </div>
            <FaqAccordion items={faqItems} />
          </div>
        </section>
      )}

      {/* ── CTA Section ── */}
      <section className="py-20 bg-[var(--color-hero-bg)]">
        <div className="mx-auto max-w-4xl px-6 text-center text-white">
          <h2 className="font-[family-name:var(--font-heading)] text-4xl md:text-5xl font-bold mb-6">
            {t("ctaTitle")}
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-10">
            {t("ctaSubtitle")}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button href="/register" variant="primary">
              {t("getStarted")}
            </Button>
            <Button href="/services" variant="outline">
              {t("exploreServices")}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
