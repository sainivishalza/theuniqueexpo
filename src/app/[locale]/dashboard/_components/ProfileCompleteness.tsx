"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Completeness } from "@/lib/profile-completeness";

// "Your profile is 70% complete" with what is still missing. `link` adds the way to the profile (for other pages).
export default function ProfileCompleteness({ completeness, link = false }: { completeness: Completeness; link?: boolean }) {
  const t = useTranslations("profileCompleteness");
  const tc = useTranslations("bulkRegister.core");
  const labelId = useId();
  const { percent, missing } = completeness;
  if (missing.length === 0) {
    return <p role="status" className="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900"><span aria-hidden="true">✅ </span>{t("complete")}</p>;
  }
  return (
    <section aria-labelledby={labelId} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={labelId} className="text-sm font-bold text-amber-950">{t("title", { percent })}</h3>
        {link && <Link href="/dashboard/buyer/profile" className="text-sm font-semibold text-emerald-800 underline hover:text-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2">{t("completeProfile")}</Link>}
      </div>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-labelledby={labelId} className="mt-2 h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-amber-200">
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-3 text-sm text-amber-950">
        <span className="font-semibold">{t("missing")}</span> {missing.map((k) => tc(k)).join(", ")}
      </p>
      <p className="mt-1 text-xs text-amber-900">{t("hint")}</p>
    </section>
  );
}
