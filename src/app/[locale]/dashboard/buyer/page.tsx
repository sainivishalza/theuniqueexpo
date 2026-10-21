"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/format";
import { formatInstantDateTime } from "@/lib/date-format";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@/i18n/navigation";
import Card from "@/components/ui/Card";

// This dashboard used to be split between "buyer" and "visitor" roles --
// merged into one role/one dashboard, so it now carries both sets of
// quick actions (the "visitor"-only ones flagged below).
const ACTION_KEYS = [
  { key: "myProfile", href: "/dashboard/buyer/profile", icon: "🪪", color: "from-emerald-600 to-teal-700" },
  { key: "browseExhibitions", href: "/exhibitions", icon: "🎯", color: "from-teal-500 to-cyan-600" },
  { key: "postBuyRequest", href: "/marketplace/new", icon: "📋", color: "from-emerald-500 to-green-600" },
  { key: "marketplace", href: "/marketplace", icon: "🛒", color: "from-orange-500 to-red-500" },
  { key: "savedExhibitions", href: "/favorites", icon: "❤️", color: "from-red-400 to-pink-500" },
  { key: "savedSuppliers", icon: "⭐", color: "from-yellow-400 to-amber-500", comingSoon: true },
  { key: "messages", href: "/messages", icon: "💬", color: "from-pink-500 to-rose-500" },
  { key: "myRegistrations", href: "/dashboard/buyer/registrations", icon: "🎫", color: "from-emerald-500 to-green-600" },
  { key: "myWallet", href: "/dashboard/buyer/wallet", icon: "💰", color: "from-amber-500 to-yellow-600" },
  { key: "visitPlanner", icon: "📅", color: "from-purple-500 to-purple-600", comingSoon: true },
  { key: "meetings", icon: "📅", color: "from-pink-500 to-rose-500", comingSoon: true },
];

// Same order as the admin Buyer Profiles screen and the downloads.
const DOC_FIELDS = ["passportFront", "visaPage", "businessLicense", "businessCard", "buyerPhoto", "cantonFairCard", "invoiceOrderList"] as const;
type DocState = { hasDocument: Record<string, boolean>; documentReview: Record<string, { status: "pending" | "verified" | "rejected"; note: string }> };
const DOC_BADGE = {
  missing: "bg-gray-100 text-gray-600",
  pending: "bg-amber-50 text-amber-700",
  verified: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
} as const;

interface NewsItem { kind: string; points: number; at: string; note: string }

export default function BuyerDashboard() {
  const locale = useLocale();
  const t = useTranslations("buyerDashboard");
  const tp = useTranslations("buyerProfile");
  const tc = useTranslations("common");
  const actions = ACTION_KEYS.map((a) => ({
    ...a,
    title: t(`actions.${a.key}.title`),
    description: t(`actions.${a.key}.description`),
  }));
  const { user } = useAuth();
  // The buyer's registration number (TUE0001); stays hidden if it can't be loaded.
  const [buyerNumber, setBuyerNumber] = useState("");
  const [docs, setDocs] = useState<DocState | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  useEffect(() => {
    if (!user) return;
    fetch("/api/buyer-profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setBuyerNumber(data?.buyerNumber || "");
        if (data?.profile?.hasDocument && data.profile.documentReview) setDocs({ hasDocument: data.profile.hasDocument, documentReview: data.profile.documentReview });
      })
      .catch(() => {});
    // Recent reward news; the card stays hidden if it cannot be loaded.
    fetch("/api/wallet/news")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setNews(Array.isArray(data?.items) ? data.items : []))
      .catch(() => {});
  }, [user]);

  return (
    <div>
      {/* Hero header */}
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">🛒</div>
            <div className="text-white">
              <h1 className="text-3xl font-extrabold">{t("title")}</h1>
              <p className="mt-1 text-emerald-200/80">
                {t("welcome", { name: user?.name ? `, ${user.name}` : "" })}
              </p>
              {buyerNumber && (
                <p className="mt-2 text-sm text-emerald-100">
                  {t("registrationNumber")}: <span className="text-base font-extrabold tracking-wide text-white">{buyerNumber}</span>
                  <span className="ml-2 text-xs text-emerald-200/80">{t("registrationNumberHint")}</span>
                </p>
              )}
            </div>
          </div>
          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t("stats.activeRfqs"), value: "0", icon: "📋" },
              { label: t("stats.suppliersViewed"), value: "0", icon: "👀" },
              { label: t("stats.meetingsBooked"), value: "0", icon: "📅" },
              { label: t("stats.ordersPlaced"), value: "0", icon: "✅" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/10 backdrop-blur-sm p-4 border border-white/10">
                <div className="text-sm text-white/80 mb-1">{s.icon} {s.label}</div>
                <div className="text-2xl font-extrabold text-white">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rewards news */}
      {news.length > 0 && (
        <section className="pt-10 bg-cream-50">
          <div className="mx-auto max-w-7xl px-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-heading">{t("news.title")}</h2>
                <Link href="/dashboard/buyer/wallet" className="text-sm font-semibold text-emerald-800 underline hover:text-emerald-900">{t("news.openWallet")}</Link>
              </div>
              <ul className="mt-4 divide-y divide-gray-100">
                {news.map((n, i) => (
                  <li key={`${n.kind}-${n.at}-${i}`} className="py-2.5">
                    <p className="text-sm font-semibold text-gray-900">{t(`news.${n.kind}`, { points: formatNumber(n.points) })}</p>
                    {n.note && <p className="text-sm text-gray-700 [overflow-wrap:anywhere]">{t("news.reason", { reason: n.note })}</p>}
                    <p className="text-xs text-gray-600">{formatInstantDateTime(n.at, locale)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Documents */}
      {docs && (() => {
        const rows = DOC_FIELDS.map((field) => {
          const uploaded = !!docs.hasDocument[field];
          const review = docs.documentReview[field];
          const state = !uploaded ? "missing" : review?.status ?? "pending";
          return { field, state, note: state === "rejected" ? review?.note : "" };
        });
        const done = rows.filter((r) => r.state !== "missing").length;
        const allVerified = rows.every((r) => r.state === "verified");
        return (
          <section className="pt-10 bg-cream-50">
            <div className="mx-auto max-w-7xl px-6">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-heading">{t("documents.title")}</h2>
                    <p className="mt-1 text-sm text-gray-600">{allVerified ? t("documents.allDone") : t("documents.hint")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">{t("documents.count", { done, total: rows.length })}</span>
                    {!allVerified && (
                      <Link href="/dashboard/buyer/profile" className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
                        {t("documents.upload")}
                      </Link>
                    )}
                  </div>
                </div>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {rows.map((r) => (
                    <li key={r.field} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 px-3 py-2">
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-800">{tp(`docFields.${r.field}`)}</span>
                        {r.note && <span className="block text-xs text-red-700">{tp("docReviewStatus.rejectedReason", { reason: r.note })}</span>}
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${DOC_BADGE[r.state as keyof typeof DOC_BADGE]}`}>
                        {r.state === "missing" ? t("documents.missing") : tp(`docReviewStatus.${r.state}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        );
      })()}

      {/* Actions */}
      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-xl font-bold text-heading mb-6">{t("quickActions")}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {actions.map((a) => (
              <Card key={a.title} href={a.href} shadow="sm" hoverable className="p-6 h-full flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center text-xl flex-shrink-0`}>
                  {a.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-heading">{a.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{a.description}</p>
                  {a.comingSoon && (
                    <span className="mt-2 inline-block rounded-lg bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                      {tc("comingSoon")}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
