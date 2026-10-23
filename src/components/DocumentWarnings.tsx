"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { MyRegistration } from "@/lib/registration-lifecycle";

// "Your passport / visa will not cover this exhibition", from the dates on the buyer's profile.
export default function DocumentWarnings({ registration }: { registration: MyRegistration }) {
  const t = useTranslations("expoRegistrationStatus.documentWarnings");
  const problems = registration.documentWarnings ?? [];
  if (problems.length === 0) return null;
  return (
    <div role="note" data-testid="document-warnings" className="mt-4 rounded-[var(--radius-button)] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {problems.map((p) => <p key={p} data-problem={p}><span aria-hidden="true">🛂 </span>{t(p)}</p>)}
      <Link href="/dashboard/buyer/profile" className="mt-2 inline-block font-semibold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 rounded-sm">{t("update")}</Link>
    </div>
  );
}
