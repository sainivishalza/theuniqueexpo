"use client";
import Image from "next/image";
import { useTranslations } from "next-intl";
import Card from "@/components/ui/Card";
import IconBadge from "@/components/ui/IconBadge";
import Button from "@/components/ui/Button";

const BEFORE_TRIP_KEYS = [
  "exhibitionSelection",
  "tripPlanning",
  "exhibitionRegistrationGuidance",
  "businessMeetingPlanning",
  "itineraryPreparation",
];

const DURING_TRIP_KEYS = [
  "hotel",
  "airportTransfer",
  "exhibitionTransfer",
  "exhibitionAccompaniment",
  "interpreterCoordination",
  "supplierMeetings",
  "factoryVisits",
];

const TOUR_TYPES = [
  { key: "exhibitionVisit", icon: "🎫" },
  { key: "businessTour", icon: "🧳" },
  { key: "businessPlus", icon: "🤝" },
  { key: "customProgram", icon: "✨" },
];

export default function BusinessToursPage() {
  const t = useTranslations("businessToursOverviewPage");

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
          <h1 className="text-4xl md:text-5xl font-extrabold">{t("title")}</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-2xl">{t("subtitle")}</p>
        </div>
      </section>

      {/* Before / During */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-2">
            <Card shadow="sm" bordered={false} className="p-8">
              <IconBadge icon="📝" size="lg" tint="bg-emerald-50" />
              <h2 className="mt-5 text-2xl font-bold text-heading">{t("beforeYourTrip")}</h2>
              <ul className="mt-6 space-y-2.5">
                {BEFORE_TRIP_KEYS.map((key) => (
                  <li key={key} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="text-gold-600 mt-1 shrink-0 text-[10px]">●</span>
                    {t(`before.${key}`)}
                  </li>
                ))}
              </ul>
            </Card>
            <Card shadow="sm" bordered={false} className="p-8">
              <IconBadge icon="🧭" size="lg" tint="bg-gold-50" />
              <h2 className="mt-5 text-2xl font-bold text-heading">{t("duringYourTrip")}</h2>
              <ul className="mt-6 space-y-2.5">
                {DURING_TRIP_KEYS.map((key) => (
                  <li key={key} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="text-gold-600 mt-1 shrink-0 text-[10px]">●</span>
                    {t(`during.${key}`)}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Tour types */}
      <section className="py-16 bg-cream-50">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-12">
            <h2 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-bold text-heading">{t("tourTypesTitle")}</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">{t("tourTypesSubtitle")}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {TOUR_TYPES.map((tourType) => (
              <Card key={tourType.key} shadow="sm" bordered={false} className="p-6 flex flex-col">
                <IconBadge icon={tourType.icon} size="md" tint="bg-emerald-50" />
                <h3 className="mt-4 text-lg font-bold text-heading">{t(`tourTypes.${tourType.key}.title`)}</h3>
                <p className="mt-2 text-sm text-gray-500 flex-1">{t(`tourTypes.${tourType.key}.description`)}</p>
                <div className="mt-6">
                  <Button href={`/plan-business-trip?tourType=${tourType.key}`} variant="secondaryOutline" size="block">
                    {t("requestAQuote")}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
