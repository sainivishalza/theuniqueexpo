import { formatDateOnly } from "@/lib/client/registration-format";
import { CLOSING_SOON_DAYS } from "@/lib/registration-window";

export interface WindowFields {
  registrationState?: "open" | "opens_later" | "deadline_passed" | "switched_off";
  registrationOpens?: string | null;
  registrationCloses?: string | null;
  registrationDaysToClose?: number | null;
  registrationDaysToOpen?: number | null;
}

/** Is there anything to say? (So a caller can skip an empty wrapper.) */
export function hasWindowNote(info: WindowFields): boolean {
  return (info.registrationState === "opens_later" && !!info.registrationOpens) || (info.registrationState === "deadline_passed" && !!info.registrationCloses) || (info.registrationState === "open" && !!info.registrationCloses);
}

// "Closes in 5 days" / "Register by 20 Nov" / "Registration opens 1 Dec" / "Registration closed on 5 Nov": what the
// admin's opening and closing days mean for a buyer, in one line. The caller passes its own translator (the keys are
// the same in every namespace that uses it: closesToday, closesTomorrow, closesIn, registerBy, opensOn, closedOn), so it
// works on public pages and in the dashboard, which carry different message namespaces.
export default function RegistrationWindowNote({
  info,
  t,
  locale,
  className = "",
}: {
  info: WindowFields;
  t: (key: string, values?: Record<string, string | number>) => string;
  locale: string;
  className?: string;
}) {
  const { registrationState: state, registrationCloses: closes, registrationOpens: opens } = info;
  if (state === "opens_later" && opens) {
    return <p className={`text-sm font-medium text-amber-900 ${className}`}>{t("opensOn", { date: formatDateOnly(opens, locale) })}</p>;
  }
  if (state === "deadline_passed" && closes) {
    return <p className={`text-sm font-medium text-gray-700 ${className}`}>{t("closedOn", { date: formatDateOnly(closes, locale) })}</p>;
  }
  if (state === "open" && closes) {
    const days = info.registrationDaysToClose ?? null;
    if (days !== null && days <= CLOSING_SOON_DAYS) {
      const urgent = days <= 3;
      const text = days === 0 ? t("closesToday") : days === 1 ? t("closesTomorrow") : t("closesIn", { days });
      return (
        <p className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${urgent ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"} ${className}`}>
          <span aria-hidden="true">⏳ </span>{text}
        </p>
      );
    }
    return <p className={`text-sm text-gray-700 ${className}`}>{t("registerBy", { date: formatDateOnly(closes, locale) })}</p>;
  }
  return null;
}
