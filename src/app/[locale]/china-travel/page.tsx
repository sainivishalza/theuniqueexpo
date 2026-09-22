import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { getChinaTravelContent } from "@/lib/server/china-travel-content-repo";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import IconBadge from "@/components/ui/IconBadge";

export const revalidate = 60;

export default async function ChinaTravelPage({
  searchParams,
}: {
  searchParams: Promise<{ exhibitionSlug?: string }>;
}) {
  const t = await getTranslations("chinaTravelPage");
  const content = await getChinaTravelContent();
  const { exhibitionSlug } = await searchParams;
  const contextQuery = exhibitionSlug ? `?exhibitionSlug=${encodeURIComponent(exhibitionSlug)}` : "";

  return (
    <div>
      <section className="relative overflow-hidden bg-[var(--color-hero-bg)] py-20">
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <h1 className="text-4xl md:text-5xl font-extrabold">{t("title")}</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-2xl">{t("subtitle")}</p>
        </div>
      </section>

      {/* Destinations */}
      {content.destinations.length > 0 && (
        <section className="py-16 bg-white">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center mb-12">
              <h2 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold text-heading">{t("destinationsTitle")}</h2>
              <p className="mt-3 text-gray-500 max-w-xl mx-auto">{t("destinationsSubtitle")}</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {content.destinations.map((dest) => (
                <Card key={dest.name} shadow="sm" bordered={false}>
                  <div className="relative h-44 overflow-hidden bg-gray-900">
                    {dest.image ? (
                      <Image
                        src={dest.image}
                        alt={dest.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 gradient-brand flex items-center justify-center text-5xl">{dest.icon}</div>
                    )}
                    <div className="absolute inset-0 gradient-overlay" />
                    <div className="absolute top-3 left-3">
                      <IconBadge icon={dest.icon} size="sm" bgClassName="bg-white/90 text-current shadow-sm" />
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-lg font-bold text-white leading-tight drop-shadow-lg">{dest.name}</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-gray-500">{dest.tagline}</p>
                    {dest.highlights.length > 0 && (
                      <ul className="mt-4 space-y-1.5">
                        {dest.highlights.map((h) => (
                          <li key={h} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-gold-600 mt-1 shrink-0 text-[10px]">●</span>
                            {h}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Routes */}
      {content.routes.length > 0 && (
        <section className="py-16 bg-cream-50">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center mb-12">
              <h2 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold text-heading">{t("routesTitle")}</h2>
              <p className="mt-3 text-gray-500 max-w-xl mx-auto">{t("routesSubtitle")}</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {content.routes.map((route) => (
                <Card key={route.title} shadow="sm" bordered={false} className="p-6 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold text-heading">{route.title}</h3>
                    <span className="shrink-0 rounded-[var(--radius-badge)] bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">{route.duration}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500 flex-1">{route.description}</p>
                  <div className="mt-5">
                    <Button href={`/plan-business-trip${contextQuery}${contextQuery ? "&" : "?"}route=${encodeURIComponent(route.title)}`} variant="secondaryOutline" size="wide">
                      {t("planThisRoute")}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Custom route */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-heading">{t("customRouteTitle")}</h2>
          <p className="mt-3 text-gray-500">{t("customRouteSubtitle")}</p>
          <Button href={`/plan-business-trip${contextQuery}`} variant="gradientCta" size="wide" className="mt-6">
            {t("createMyRoute")}
          </Button>
        </div>
      </section>
    </div>
  );
}
