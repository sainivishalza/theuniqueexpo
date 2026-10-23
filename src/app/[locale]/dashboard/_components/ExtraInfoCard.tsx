"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface Row {
  key: string;
  label: string;
  kind: string;
  value: string;
  hasFile: boolean;
  updatedAt: number;
}

const CORE_FIELDS = [
  "gender", "nationality", "passportNumber", "phone", "email", "companyName", "companyType", "companyTypeOther", "companyScale", "purposeOfVisit",
  "infoSource", "infoSourceOther", "exportingMarkets", "exportingMarketOther", "docPassportFront", "docBusinessCard", "docVisaPage", "docBusinessLicense",
];

// On the profile page: the answers to registration questions that have no field in the profile, kept for next time.
export default function ExtraInfoCard() {
  const t = useTranslations("bulkRegister.extra");
  const tc = useTranslations("bulkRegister.core");
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    fetch("/api/buyer-profile/extra-info", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setRows(d?.items ?? []))
      .catch(() => setRows([]));
  }, []);

  if (!rows || rows.length === 0) return null;

  const name = (r: Row) => {
    const core = r.key.startsWith("core:") ? r.key.slice(5) : "";
    return core && CORE_FIELDS.includes(core) ? tc(core) : r.label || r.key.replace(/^custom:/, "").split("|")[0];
  };
  const show = (r: Row) => {
    if (r.kind === "file") return r.hasFile ? t("file") : t("empty");
    if (r.kind === "list") {
      try {
        const list = JSON.parse(r.value);
        return Array.isArray(list) && list.length ? list.join(", ") : t("empty");
      } catch {
        return r.value || t("empty");
      }
    }
    return r.value || t("empty");
  };

  return (
    <div id="extra-info" className="scroll-mt-24 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="font-bold text-heading">{t("title")}</h2>
      <p className="mt-1 text-sm text-gray-600">{t("intro")}</p>
      <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.key} className="min-w-0">
            <dt className="text-sm text-gray-600 [overflow-wrap:anywhere]">{name(r)}</dt>
            <dd className="text-sm font-semibold text-heading [overflow-wrap:anywhere]">{show(r)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
