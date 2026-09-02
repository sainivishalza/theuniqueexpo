"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";

const ACTION_KEYS = [
  { key: "browseExhibitions", href: "/exhibitions", icon: "🎯", color: "from-teal-500 to-cyan-600" },
  { key: "exhibitorDirectory", href: "/directory", icon: "🏢", color: "from-purple-500 to-purple-600" },
  { key: "postBuyRequest", href: "/marketplace/new", icon: "📋", color: "from-emerald-500 to-green-600" },
  { key: "marketplace", href: "/marketplace", icon: "🛒", color: "from-orange-500 to-red-500" },
  { key: "savedExhibitions", href: "/favorites", icon: "❤️", color: "from-red-400 to-pink-500" },
  { key: "savedSuppliers", icon: "⭐", color: "from-yellow-400 to-amber-500", comingSoon: true },
  { key: "meetings", icon: "📅", color: "from-pink-500 to-rose-500", comingSoon: true },
];

export default function BuyerDashboard() {
  const t = useTranslations("buyerDashboard");
  const tc = useTranslations("common");
  const actions = ACTION_KEYS.map((a) => ({
    ...a,
    title: t(`actions.${a.key}.title`),
    description: t(`actions.${a.key}.description`),
  }));
  const { user } = useAuth();

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
                <div className="text-sm opacity-70 mb-1">{s.icon} {s.label}</div>
                <div className="text-2xl font-extrabold text-white">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">{t("quickActions")}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {actions.map((a) => {
              const content = (
                <div className="flex items-start gap-4 p-6 rounded-2xl bg-white border border-gray-100 shadow-sm card-hover h-full">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center text-xl flex-shrink-0`}>
                    {a.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{a.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{a.description}</p>
                    {a.comingSoon && (
                      <span className="mt-2 inline-block rounded-lg bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-400">
                        {tc("comingSoon")}
                      </span>
                    )}
                  </div>
                </div>
              );
              return a.href ? (
                <Link key={a.title} href={a.href}>{content}</Link>
              ) : (
                <div key={a.title}>{content}</div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
