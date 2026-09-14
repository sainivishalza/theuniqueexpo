"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { serviceCategories } from "@/lib/services";
import Card from "@/components/ui/Card";

const MARKET_AREA_KEYS = [
  { key: "linyi", emoji: "📦", slug: "linyi-20-22-sept" },
  { key: "guzhen", emoji: "💡", slug: "guzhen-lighting-fair" },
  { key: "shenzhen", emoji: "📱", slug: "cioe-shenzhen" },
  { key: "dongguan", emoji: "🏭", slug: "dongguan-manufacturing" },
  { key: "wuxi", emoji: "⚙️", slug: "wuxi-industrial" },
  { key: "hongKong", emoji: "🌐", slug: "hk-electronics-fair" },
  { key: "beijing", emoji: "🏛️", slug: "ciftis-beijing" },
  { key: "shanghai", emoji: "🪑", slug: "ciff-shanghai" },
  { key: "nanning", emoji: "🤝", slug: "caexpo-nanning" },
  { key: "guangzhou", emoji: "💄", slug: "cibe-guangzhou" },
  { key: "weifang", emoji: "🌾", slug: "weifang-agriculture" },
  { key: "taizhou", emoji: "🔧", slug: "taizhou-plastics" },
  { key: "hangzhou", emoji: "☁️", slug: "apsara-hangzhou" },
  { key: "macao", emoji: "🎰", slug: "mif-macao" },
  { key: "shantou", emoji: "🧸", slug: "shantou-toys" },
];

const BENEFIT_KEYS = [
  { key: "endToEnd", icon: "🎯" },
  { key: "experience", icon: "🌍" },
  { key: "network", icon: "🤝" },
  { key: "support", icon: "💬" },
];

export default function ServicesPage() {
  const t = useTranslations("servicesPage");
  const marketAreas = MARKET_AREA_KEYS.map((m) => ({
    ...m,
    city: t(`marketAreas.${m.key}.city`),
    desc: t(`marketAreas.${m.key}.desc`),
  }));
  const benefits = BENEFIT_KEYS.map((b) => ({
    ...b,
    title: t(`benefits.${b.key}.title`),
    desc: t(`benefits.${b.key}.desc`),
  }));
  return (
    <div>
      <section className="relative overflow-hidden bg-[var(--color-hero-bg)] py-20">
        <div className="absolute inset-0 opacity-15">
          <Image
            src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1600&h=600&fit=crop&q=80"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <h1 className="text-4xl md:text-5xl font-extrabold">{t("heroTitle")}</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-2xl">{t("heroSubtitle")}</p>
        </div>
      </section>

      {/* Markets We Cover */}
      <section className="py-16 bg-[var(--color-hero-bg)]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">{t("marketsWeCoverTitle")}</h2>
            <p className="text-cream-200 text-lg max-w-2xl mx-auto">{t("marketsWeCoverSubtitle")}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {marketAreas.map((m) => (
              <Link key={m.city} href={`/exhibitions/${m.slug}`} className="group relative rounded-[var(--radius-card)] bg-white/10 backdrop-blur-sm border border-white/20 p-4 text-center hover:bg-white/20 hover:border-gold-500 transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">
                <div className="text-3xl mb-2">{m.emoji}</div>
                <h3 className="font-bold text-white text-sm">{m.city}</h3>
                <p className="text-xs text-cream-200 mt-1">{m.desc}</p>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/exhibitions" className="inline-block rounded-[var(--radius-button)] bg-gold-500 px-6 py-3 font-semibold text-emerald-950 hover:bg-gold-600 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">
              {t("viewAllExhibitions")}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-cream-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {serviceCategories.map((svc) => (
              <Card
                key={svc.id}
                href={svc.slug === "business-tours" || svc.slug === "china-tours" ? "/services/" + svc.slug : svc.slug === "transport-subsidies" ? "/services/transport-subsidies" : "/services/" + svc.slug}
                bordered={false}
              >
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={svc.image}
                    alt={t(svc.titleKey)}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 gradient-overlay" />
                  <div className="absolute top-4 left-4">
                    <span className="rounded-[var(--radius-badge)] bg-white/90 backdrop-blur-sm px-3 py-1 text-xl">{svc.icon}</span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-bold text-white drop-shadow-lg">{t(svc.titleKey)}</h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-500 mb-4 line-clamp-3">{t(svc.descriptionKey)}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {svc.featureKeys.slice(0, 4).map((f) => (
                      <span key={f} className="rounded-[var(--radius-badge)] bg-gray-100 px-2.5 py-1 text-xs text-gray-600">{t(f)}</span>
                    ))}
                    {svc.featureKeys.length > 4 && <span className="rounded-[var(--radius-badge)] bg-gray-100 px-2.5 py-1 text-xs text-gray-400">{t("moreFeatures", { count: svc.featureKeys.length - 4 })}</span>}
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-900 group-hover:text-gold-600 transition-colors">
                    {t(svc.ctaKey)}
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-3xl font-extrabold text-heading mb-4">{t("whyChooseTitle")}</h2>
          <p className="text-gray-500 max-w-2xl mx-auto mb-12">{t("whyChooseSubtitle")}</p>
          <div className="grid gap-8 md:grid-cols-4">
            {benefits.map((b) => (
              <div key={b.key} className="text-center">
                <div className="w-16 h-16 mx-auto rounded-[var(--radius-icon-lg)] bg-emerald-50 flex items-center justify-center text-3xl mb-4">{b.icon}</div>
                <h3 className="font-bold text-heading mb-1">{b.title}</h3>
                <p className="text-sm text-gray-500">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
