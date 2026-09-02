"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";

const FEATURE_KEYS = [
  { key: "browseExhibitions", icon: "🎯", color: "from-teal-500 to-cyan-600" },
  { key: "visitPlanner", icon: "📅", color: "from-purple-500 to-purple-600" },
  { key: "savedExhibitions", href: "/favorites", icon: "❤️", color: "from-red-400 to-pink-500" },
  { key: "savedExhibitors", icon: "⭐", color: "from-yellow-400 to-amber-500" },
  { key: "myRegistrations", icon: "🎫", color: "from-emerald-500 to-green-600" },
  { key: "messages", href: "/messages", icon: "💬", color: "from-pink-500 to-rose-500" },
  { key: "content", icon: "📰", color: "from-orange-500 to-red-500" },
];

export default function VisitorDashboard() {
  const t = useTranslations("visitorDashboard");
  const tc = useTranslations("common");
  const features = FEATURE_KEYS.map((f) => ({
    ...f,
    title: t(`features.${f.key}.title`),
    description: t(`features.${f.key}.description`),
  }));
  const { user } = useAuth();

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">🎫</div>
            <div className="text-white">
              <h1 className="text-3xl font-extrabold">{t("title")}</h1>
              <p className="mt-1 text-emerald-200/80">{t("welcome", { name: user?.name ? `, ${user.name}` : "" })}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const content = (
                <div className="flex items-start gap-4 p-6 rounded-2xl bg-white border border-gray-100 shadow-sm card-hover h-full">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-xl flex-shrink-0`}>
                    {f.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{f.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{f.description}</p>
                    {!f.href && (
                      <span className="mt-2 inline-block rounded-lg bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-400">{tc("comingSoon")}</span>
                    )}
                  </div>
                </div>
              );
              return f.href ? (
                <Link key={f.title} href={f.href}>{content}</Link>
              ) : (
                <div key={f.title}>{content}</div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
