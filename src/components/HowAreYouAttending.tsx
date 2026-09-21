"use client";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import IconBadge from "@/components/ui/IconBadge";
import TripInquiryButton from "@/components/TripInquiryButton";

const IN_CHINA_SERVICE_KEYS = [
  "exhibitionRegistration",
  "localTransportation",
  "exhibitionAccompaniment",
  "interpreter",
  "supplierMeetings",
  "factoryVisits",
  "businessNetworking",
];

const TRAVELLING_SERVICE_KEYS = [
  "hotel",
  "airportTransfer",
  "exhibitionTransfer",
  "exhibitionAssistance",
  "businessMeetings",
  "interpreter",
  "factoryVisits",
  "additionalItinerary",
];

// Two-path segmentation section -- lets a visitor self-identify as already
// in China or travelling in for an exhibition, each with its own service
// list and CTA. Used on the homepage and the exhibitions listing page (see
// section 4 of the site restructure brief).
export default function HowAreYouAttending() {
  const t = useTranslations("howAreYouAttending");

  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 mb-4">{t("badge")}</p>
          <h2 className="font-[family-name:var(--font-heading)] text-4xl font-bold text-heading">{t("title")}</h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Card shadow="sm" bordered={false} className="p-8">
            <IconBadge icon="🇨🇳" size="lg" tint="bg-emerald-50" />
            <h3 className="mt-5 text-2xl font-bold text-heading">{t("inChina.title")}</h3>
            <p className="mt-2 text-gray-500">{t("inChina.subtitle")}</p>
            <ul className="mt-6 space-y-2.5">
              {IN_CHINA_SERVICE_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className="text-gold-600 mt-1 shrink-0 text-[10px]">●</span>
                  {t(`services.${key}`)}
                </li>
              ))}
            </ul>
            <Button href="/exhibitions" variant="secondaryOutline" size="wide" className="mt-8">
              {t("inChina.cta")}
            </Button>
          </Card>

          <Card shadow="sm" bordered={false} className="p-8">
            <IconBadge icon="✈️" size="lg" tint="bg-gold-50" />
            <h3 className="mt-5 text-2xl font-bold text-heading">{t("travelling.title")}</h3>
            <p className="mt-2 text-gray-500">{t("travelling.subtitle")}</p>
            <ul className="mt-6 space-y-2.5">
              {TRAVELLING_SERVICE_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className="text-gold-600 mt-1 shrink-0 text-[10px]">●</span>
                  {t(`services.${key}`)}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <TripInquiryButton
                label={t("travelling.cta")}
                variant="gradientCta"
                size="wide"
                attendingType="traveling"
              />
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
