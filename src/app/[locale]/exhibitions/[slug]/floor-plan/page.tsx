"use client";

import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { initBooths, type Booth } from "@/lib/booths";
import { useAuth } from "@/lib/auth-context";
import { formatNumber, formatCurrency } from "@/lib/format";

interface Exhibition { id: string; slug: string; title: string; }

const SIZE_COLORS: Record<string, string> = {
  platinum: "bg-amber-400 hover:bg-amber-300 border-amber-500/30",
  gold: "bg-teal-400 hover:bg-teal-300 border-teal-500/30",
  standard: "bg-emerald-400 hover:bg-emerald-300 border-emerald-500/30",
};

const SIZE_PRICES: Record<string, string> = {
  platinum: "$15,000",
  gold: "$8,000",
  standard: "$3,500",
};

export default function FloorPlanPage() {
  const t = useTranslations("floorPlanPage");
  const SIZE_LABELS: Record<string, { label: string; price: string }> = {
    platinum: { label: t("sizes.platinum"), price: SIZE_PRICES.platinum },
    gold: { label: t("sizes.gold"), price: SIZE_PRICES.gold },
    standard: { label: t("sizes.standard"), price: SIZE_PRICES.standard },
  };
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { user } = useAuth();
  const [selected, setSelected] = useState<Booth | null>(null);
  const [expo, setExpo] = useState<Exhibition | null | undefined>(undefined);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/exhibitions/${slug}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setExpo(data.exhibition))
      .catch(() => setExpo(null));
  }, [slug]);

  const booths = useMemo(() => {
    if (!expo) return [];
    return initBooths(expo.id);
  }, [expo]);

  if (expo === undefined) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-400">{t("loading")}</div>;
  }

  if (!expo) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900">{t("notFound")}</h1>
          <Link href="/exhibitions" className="mt-4 inline-block text-emerald-600 hover:underline">{t("browseAll")}</Link>
        </div>
      </div>
    );
  }

  const rows = ["A", "B", "C", "D", "E"];
  const cols = 8;

  return (
    <div>
      {/* Hero */}
      <section className="bg-gray-900 py-8">
        <div className="mx-auto max-w-7xl px-6">
          <Link href={`/exhibitions/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            {t("backTo", { name: expo.title })}
          </Link>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-2 text-gray-400">{t("subtitle")}</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          {/* Legend */}
          <div className="mb-8 flex flex-wrap gap-5 items-center">
            {Object.entries(SIZE_LABELS).map(([size, { label, price }]) => (
              <div key={size} className="flex items-center gap-2">
                <span className={`inline-block h-4 w-4 rounded ${SIZE_COLORS[size].split(" ")[0]}`} />
                <span className="text-sm font-medium text-gray-700">{label} — {price}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 rounded bg-red-400" />
              <span className="text-sm font-medium text-gray-700">{t("booked")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 rounded bg-gray-600" />
              <span className="text-sm font-medium text-gray-700">{t("selected")}</span>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-4">
            {/* Floor plan */}
            <div className="lg:col-span-3 rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-6">{t("hallMap")}</h2>
              <div className="overflow-x-auto">
                <div className="inline-block min-w-[500px]">
                  {/* Column headers */}
                  <div className="mb-2 flex">
                    <div className="w-10" />
                    {Array.from({ length: cols }, (_, i) => (
                      <div key={i} className="flex h-8 w-[72px] items-center justify-center text-xs font-semibold text-gray-400">
                        {i + 1}
                      </div>
                    ))}
                  </div>

                  {/* Rows */}
                  {rows.map((row) => (
                    <div key={row} className="mb-2 flex items-center">
                      <div className="w-10 text-center text-sm font-bold text-gray-500">{row}</div>
                      {Array.from({ length: cols }, (_, i) => {
                        const booth = booths.find((b) => b.row === row && b.col === i + 1);
                        if (!booth) return <div key={i} className="h-16 w-[72px]" />;

                        const isBooked = booth.status === "booked";
                        const isSelected = selected?.id === booth.id;

                        return (
                          <button
                            key={i}
                            onClick={() => {
                              if (!isBooked) setSelected(isSelected ? null : booth);
                            }}
                            disabled={isBooked}
                            title={isBooked ? t("bookedBy", { name: booth.exhibitorName || "" }) : `${booth.size} — ${formatCurrency(booth.price)}`}
                            className={`mr-2 flex h-16 w-[72px] flex-col items-center justify-center rounded-xl border-2 text-[10px] font-bold transition-all duration-200 ${
                              isSelected
                                ? "border-gray-600 bg-gray-600 text-white ring-2 ring-gray-300 shadow-lg"
                                : isBooked
                                  ? "cursor-not-allowed border-red-300 bg-red-100 text-red-600"
                                  : `${SIZE_COLORS[booth.size]} text-gray-800 shadow-sm hover:shadow-md`
                            }`}
                          >
                            <span className="text-xs font-bold">{row}{i + 1}</span>
                            {isBooked ? (
                              <span className="mt-0.5 text-[9px] opacity-60">{t("booked")}</span>
                            ) : (
                              <span className="mt-0.5 text-[9px] opacity-70">
                                ${booth.price >= 1000 ? `${booth.price / 1000}k` : booth.price}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}

                  {/* Stage */}
                  <div className="mt-6 flex justify-center">
                    <div className="flex h-14 w-96 items-center justify-center rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 text-sm font-bold text-gray-300 shadow-lg">
                      {t("mainStage")}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Selection panel */}
            <div className="space-y-6">
              {selected ? (
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                  <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white text-sm font-bold mb-4">✓</div>
                  <h3 className="text-lg font-bold text-gray-900">{t("boothLabel", { id: `${selected.row}${selected.col}` })}</h3>
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t("size")}</span>
                      <span className="font-semibold capitalize text-gray-900">{selected.size}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t("price")}</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(selected.price)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t("status")}</span>
                      <span className="font-semibold text-green-600">{t("available")}</span>
                    </div>
                  </div>
                  {user?.role === "exhibitor" ? (
                    <Link
                      href={`/exhibitions/${slug}/book/${selected.id}`}
                      className="mt-6 block w-full text-center rounded-xl gradient-brand py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                    >
                      {t("bookFor", { price: formatCurrency(selected.price) })}
                    </Link>
                  ) : (
                    <Link
                      href="/register"
                      className="mt-6 block w-full text-center rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
                    >
                      {t("registerAsExhibitor")}
                    </Link>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 text-center">
                  <div className="text-4xl mb-3">🗺️</div>
                  <h3 className="text-lg font-bold text-gray-900">{t("selectABooth")}</h3>
                  <p className="mt-2 text-sm text-gray-500">{t("selectABoothHint")}</p>
                </div>
              )}

              {/* Quick stats */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-4">{t("boothStats")}</h3>
                <div className="space-y-3">
                  {[
                    { label: t("totalBooths"), value: booths.length, color: "text-gray-900" },
                    { label: t("available"), value: booths.filter(b => b.status === "available").length, color: "text-green-600" },
                    { label: t("booked"), value: booths.filter(b => b.status === "booked").length, color: "text-red-500" },
                  ].map((s) => (
                    <div key={s.label} className="flex justify-between text-sm">
                      <span className="text-gray-500">{s.label}</span>
                      <span className={`font-bold ${s.color}`}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
