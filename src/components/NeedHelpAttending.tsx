"use client";
import { useTranslations } from "next-intl";
import TripInquiryButton from "@/components/TripInquiryButton";

interface NeedHelpAttendingProps {
  exhibitionSlug?: string;
  exhibitionTitle?: string;
}

// Compact "book a business trip" CTA dropped into every exhibition detail
// page (once mid-page, once at the bottom, per the site restructure brief)
// -- the same two-path pattern as HowAreYouAttending, but scoped to this
// one exhibition so the resulting inquiry carries its slug for context.
export default function NeedHelpAttending({ exhibitionSlug, exhibitionTitle }: NeedHelpAttendingProps) {
  const t = useTranslations("needHelpAttending");

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
          <TripInquiryButton
            label={t("planMyBusinessTrip")}
            variant="primary"
            size="block"
            attendingType="traveling"
            exhibitionSlug={exhibitionSlug}
            context={exhibitionTitle}
          />
        </div>
      </div>
    </div>
  );
}
