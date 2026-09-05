"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";

const SECTION_KEYS = [
  { key: "exhibitionManagement", href: "/admin/exhibitions", icon: "🎪", color: "from-emerald-500 to-emerald-600" },
  { key: "tourManagement", href: "/admin/tours", icon: "🧳", color: "from-cyan-500 to-blue-600" },
  { key: "eventManagement", href: "/admin/events", icon: "🎉", color: "from-pink-500 to-rose-600" },
  { key: "blogManagement", href: "/admin/blog", icon: "📰", color: "from-indigo-500 to-purple-600" },
  { key: "rfqReview", href: "/admin/rfqs", icon: "📋", color: "from-purple-500 to-purple-600" },
  { key: "hotelBookings", href: "/admin/hotels", icon: "🏨", color: "from-amber-500 to-yellow-600" },
  { key: "servicesManagement", href: "/admin/services", icon: "🛠️", color: "from-violet-500 to-purple-600" },
  { key: "aboutUsPage", href: "/admin/about", icon: "📝", color: "from-blue-500 to-cyan-600" },
  { key: "websitePages", href: "/admin/pages", icon: "📄", color: "from-sky-500 to-indigo-600" },
  { key: "userManagement", icon: "👥", color: "from-orange-500 to-red-500", comingSoon: true },
];

export default function AdminPage() {
  const t = useTranslations("adminHome");
  const ta = useTranslations("adminCommon");
  const { user } = useAuth();
  const [stats, setStats] = useState({ exhibitions: 0, openRfqs: 0, hotelBookings: 0, totalRfqs: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    Promise.all([
      fetch("/api/exhibitions").then((r) => r.json()),
      fetch("/api/rfqs").then((r) => r.json()),
      fetch("/api/admin/hotel-bookings").then((r) => r.json()),
    ])
      .then(([exhibitionsData, rfqsData, bookingsData]: [
        { exhibitions?: unknown[] },
        { rfqs?: { status: string }[] },
        { bookings?: unknown[] },
      ]) => {
        const rfqs = rfqsData.rfqs || [];
        setStats({
          exhibitions: (exhibitionsData.exhibitions || []).length,
          openRfqs: rfqs.filter((r) => r.status === "open").length,
          hotelBookings: (bookingsData.bookings || []).length,
          totalRfqs: rfqs.length,
        });
      })
      .finally(() => setStatsLoading(false));
  }, [user]);

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900">{t("accessDenied")}</h1>
          <p className="mt-2 text-gray-500">{ta("accessRequired")}</p>
          <p className="mt-1 text-xs text-gray-400">{t("loginTip")}</p>
          <Link href="/" className="mt-4 inline-block text-emerald-600 hover:underline text-sm font-semibold">{t("goHome")}</Link>
        </div>
      </div>
    );
  }

  const sections = SECTION_KEYS.map((s) => ({
    ...s,
    title: t(`sections.${s.key}.title`),
    description: t(`sections.${s.key}.description`),
  }));

  const statCards = [
    { label: t("stats.exhibitions"), value: stats.exhibitions, icon: "🎪" },
    { label: t("stats.openRfqs"), value: stats.openRfqs, icon: "📋" },
    { label: t("stats.hotelBookings"), value: stats.hotelBookings, icon: "🏨" },
    { label: t("stats.totalRfqs"), value: stats.totalRfqs, icon: "📊" },
  ];

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">⚙️</div>
            <div className="text-white">
              <h1 className="text-3xl font-extrabold">{t("title")}</h1>
              <p className="mt-1 text-emerald-200/80">{t("subtitle")}</p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((s) => (
              <div key={s.label} className="rounded-xl bg-white/10 backdrop-blur-sm p-4 border border-white/10">
                <div className="text-sm opacity-70 mb-1">{s.icon} {s.label}</div>
                <div className="text-2xl font-extrabold text-white">{statsLoading ? "…" : s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 grid gap-5 sm:grid-cols-2">
          {sections.map((s) => {
            const content = (
              <div className="flex items-start gap-4 p-6 rounded-2xl bg-white border border-gray-100 shadow-sm card-hover h-full">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-xl flex-shrink-0`}>
                  {s.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{s.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{s.description}</p>
                  {s.comingSoon && <span className="mt-2 inline-block rounded-lg bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-400">{t("comingSoon")}</span>}
                </div>
              </div>
            );
            return s.href ? <Link key={s.title} href={s.href}>{content}</Link> : <div key={s.title}>{content}</div>;
          })}
        </div>
      </section>
    </div>
  );
}
