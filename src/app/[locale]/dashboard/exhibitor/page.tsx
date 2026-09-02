"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { getBookingsForExhibitor } from "@/lib/booths";
import { formatCurrency } from "@/lib/format";

export default function ExhibitorDashboard() {
  const t = useTranslations("exhibitorDashboard");
  const tc = useTranslations("common");
  const { user } = useAuth();
  const bookings = user ? getBookingsForExhibitor(String(user.id)) : [];

  return (
    <div>
      {/* Hero header */}
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">🏢</div>
            <div className="text-white">
              <h1 className="text-3xl font-extrabold">{t("title")}</h1>
              <p className="mt-1 text-emerald-200/80">
                {t("welcome", { name: user?.name ? `, ${user.name}` : "" })}
              </p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t("stats.boothBookings"), value: bookings.length, icon: "🏗️" },
              { label: t("stats.leadsCaptured"), value: "0", icon: "👤" },
              { label: t("stats.profileViews"), value: "0", icon: "👁️" },
              { label: t("stats.messages"), value: "0", icon: "💬" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/10 backdrop-blur-sm p-4 border border-white/10">
                <div className="text-sm opacity-70 mb-1">{s.icon} {s.label}</div>
                <div className="text-2xl font-extrabold text-white">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          {/* Quick actions */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-10">
            <Link href="/exhibitions" className="flex items-start gap-4 p-6 rounded-2xl bg-white border border-gray-100 shadow-sm card-hover">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-xl">🏗️</div>
              <div>
                <h3 className="font-bold text-gray-900">{t("bookABooth")}</h3>
                <p className="text-sm text-gray-500 mt-1">{t("bookABoothDesc")}</p>
              </div>
            </Link>
            <Link href="/exhibitor/ex-1" className="flex items-start gap-4 p-6 rounded-2xl bg-white border border-gray-100 shadow-sm card-hover">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-xl">🎨</div>
              <div>
                <h3 className="font-bold text-gray-900">{t("companyProfile")}</h3>
                <p className="text-sm text-gray-500 mt-1">{t("companyProfileDesc")}</p>
              </div>
            </Link>
            <div className="flex items-start gap-4 p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-xl">📊</div>
              <div>
                <h3 className="font-bold text-gray-900">{t("leadsCrm")}</h3>
                <p className="text-sm text-gray-500 mt-1">{t("leadsCrmDesc")}</p>
                <span className="mt-2 inline-block rounded-lg bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-400">{tc("comingSoon")}</span>
              </div>
            </div>
          </div>

          {/* Bookings */}
          <h2 className="text-xl font-bold text-gray-900 mb-5">{t("myBoothBookings")}</h2>
          {bookings.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center bg-white">
              <div className="text-5xl mb-4">🏗️</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{t("noBookingsTitle")}</h3>
              <p className="text-gray-500 mb-6">{t("noBookingsSubtitle")}</p>
              <Link
                href="/exhibitions"
                className="inline-flex items-center gap-2 rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
              >
                {t("browseExhibitions")}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((bk) => (
                <div key={bk.id} className="flex items-center justify-between rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">
                      {bk.boothId.split("-").pop()?.slice(0, 3) || "BK"}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{t("boothLabel", { id: bk.boothId.split("-").pop() || "" })}</p>
                      <p className="text-sm text-gray-500">{t("bookedOn", { date: new Date(bk.createdAt).toLocaleDateString() })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block rounded-lg px-3 py-1 text-xs font-bold ${
                      bk.status === "confirmed" ? "bg-green-100 text-green-700" : bk.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                    }`}>
                      {t(`statuses.${bk.status}`)}
                    </span>
                    <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(bk.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
