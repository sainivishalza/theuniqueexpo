"use client";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import TripInquiryButton from "@/components/TripInquiryButton";

interface NeedHelpAttendingProps {
  exhibitionSlug?: string;
  exhibitionTitle?: string;
  registrationEnabled?: boolean;
  /** "compact" is the quick 2-button CTA (top/bottom of the page). "full"
   * adds the per-box service lists and a Register button, for the one
   * mid-page "How Would You Like To Visit?" placement. */
  variant?: "compact" | "full";
}

const IN_CHINA_SERVICE_KEYS = [
  "exhibitionRegistration", "localTransportation", "exhibitionAssistance",
  "supplierMeetings", "factoryVisits", "interpreterCoordination", "businessMeetings",
];

const TRAVELLING_SERVICE_KEYS = [
  "airportTransfer", "hotel", "exhibitionRegistration", "exhibitionTransfers",
  "exhibitionAssistance", "supplierMeetings", "factoryVisits", "interpreterCoordination",
];

// Two-path "book a business trip" CTA dropped into every exhibition detail
// page (near the top and at the bottom as a compact nudge, plus once
// mid-page in its full form with service lists) -- the same two-path
// pattern as HowAreYouAttending, but scoped to this one exhibition so the
// resulting inquiry carries its slug for context.
export default function NeedHelpAttending({ exhibitionSlug, exhibitionTitle, registrationEnabled, variant = "compact" }: NeedHelpAttendingProps) {
  const t = useTranslations("needHelpAttending");
  const planTripHref = `/plan-business-trip${exhibitionSlug ? `?exhibitionSlug=${encodeURIComponent(exhibitionSlug)}` : ""}`;

  if (variant === "full") {
    return (
      <div className="rounded-[var(--radius-card)] shadow-[var(--shadow-card-sm)] p-8 bg-[var(--color-hero-bg)]">
        <h2 className="text-2xl font-bold text-white">{t("fullTitle")}</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-[var(--radius-card)] bg-white/5 border border-white/10 p-6">
            <p className="text-sm font-semibold text-gold-400 mb-1">🇨🇳 {t("inChinaLabel")}</p>
            <p className="text-sm text-white/70 mb-4">{t("inChinaText")}</p>
            <ul className="space-y-1.5 mb-5">
              {IN_CHINA_SERVICE_KEYS.map((key) => (
                <li key={key} className="text-sm text-white/80 flex items-start gap-2">
                  <span className="text-gold-400 mt-1 shrink-0 text-[10px]">●</span>
                  {t(`services.${key}`)}
                </li>
              ))}
            </ul>
            <div className="space-y-2">
              {registrationEnabled && exhibitionSlug && (
                <Button href={`/exhibitions/${exhibitionSlug}/register`} variant="primary" size="block">
                  {t("registerForExhibition")}
                </Button>
              )}
              <TripInquiryButton
                label={t("getLocalAssistance")}
                variant="outline"
                size="block"
                attendingType="in_china"
                exhibitionSlug={exhibitionSlug}
                context={exhibitionTitle}
              />
            </div>
          </div>
          <div className="rounded-[var(--radius-card)] bg-white/5 border border-white/10 p-6">
            <p className="text-sm font-semibold text-gold-400 mb-1">✈️ {t("travellingLabel")}</p>
            <p className="text-sm text-white/70 mb-4">{t("travellingText")}</p>
            <ul className="space-y-1.5 mb-5">
              {TRAVELLING_SERVICE_KEYS.map((key) => (
                <li key={key} className="text-sm text-white/80 flex items-start gap-2">
                  <span className="text-gold-400 mt-1 shrink-0 text-[10px]">●</span>
                  {t(`services.${key}`)}
                </li>
              ))}
            </ul>
            <Button href={planTripHref} variant="primary" size="block">
              {t("planMyBusinessTrip")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] shadow-[var(--shadow-card-sm)] p-8 bg-[var(--color-hero-bg)]">
      <h2 className="text-2xl font-bold text-white">{t("title")}</h2>
      <p className="mt-2 text-white/70 max-w-2xl">{t("subtitle")}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 max-w-xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gold-400 mb-2">{t("inChinaLabel")}</p>
          <TripInquiryButton
            label={t("getLocalAssistance")}
            variant="outline"
            size="block"
            attendingType="in_china"
            exhibitionSlug={exhibitionSlug}
            context={exhibitionTitle}
          />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gold-400 mb-2">{t("travellingLabel")}</p>
          <Button href={planTripHref} variant="primary" size="block">
            {t("planMyBusinessTrip")}
          </Button>
        </div>
      </div>
    </div>
  );
}
