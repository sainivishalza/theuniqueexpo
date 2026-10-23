"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatDateOnly } from "@/lib/client/registration-format";
import type { MyRegistration } from "@/lib/registration-lifecycle";

// For an exhibition the buyer attended: the next edition of the same event, with a button to register for it.
export default function NextEditionOffer({ registration }: { registration: MyRegistration }) {
  const t = useTranslations("expoRegistrationStatus.nextEdition");
  const locale = useLocale();
  const next = registration.nextEdition;
  if (!next) return null;
  return (
    <div data-testid="next-edition" className="mt-4 rounded-[var(--radius-button)] border border-emerald-200 bg-emerald-50 px-4 py-3">
      <p className="text-sm font-bold text-heading">{t("heading")}</p>
      <p className="mt-1 text-sm text-gray-700 [overflow-wrap:anywhere]">
        {next.title} · {formatDateOnly(next.startDate, locale)}
        {next.endDate && next.endDate !== next.startDate ? ` – ${formatDateOnly(next.endDate, locale)}` : ""}
      </p>
      {next.closes && <p className="mt-1 text-xs font-semibold text-emerald-900">{t("closes", { date: formatDateOnly(next.closes, locale) })}</p>}
      <Link
        href={`/exhibitions/${next.slug}/register`}
        className="mt-3 inline-block rounded-[var(--radius-button)] gradient-brand px-4 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2"
      >
        {t("button")}
      </Link>
    </div>
  );
}
