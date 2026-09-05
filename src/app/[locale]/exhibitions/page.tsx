"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lib/format";
import FavoriteButton from "@/components/FavoriteButton";

interface Exhibition {
  id: string; slug: string; title: string; dates: string; startDate: string; endDate: string;
  venue: string; city: string; country: string; industry: string; description: string;
  highlights: string[]; exhibitors: number; visitors: string; organizer: string; website: string;
  color: string; image: string;
}

export default function ExhibitionsPage() {
  const t = useTranslations("exhibitionsPage");
  const locale = useLocale();
  const dateFilterLabels: Record<string, string> = {
    all: t("allDates"),
    upcoming: t("upcoming"),
    past: t("past"),
  };
  const searchParams = useSearchParams();
  const initialView = searchParams.get("view");
  const [industry, setIndustry] = useState("All");
  const [city, setCity] = useState("All");
  const [dateFilter, setDateFilter] = useState(initialView === "past" || initialView === "upcoming" ? initialView : "all");
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/exhibitions?locale=${locale}`)
      .then((res) => res.json())
      .then((data) => setExhibitions(data.exhibitions || []))
      .finally(() => setLoading(false));
  }, [locale]);

  const industries = useMemo(() => [...new Set(exhibitions.map((e) => e.industry))].sort(), [exhibitions]);
  const cities = useMemo(() => [...new Set(exhibitions.map((e) => e.city))].sort(), [exhibitions]);

  const filtered = exhibitions.filter((e) => {
    if (industry !== "All" && e.industry !== industry) return false;
    if (city !== "All" && e.city !== city) return false;
    if (dateFilter === "upcoming" && new Date(e.endDate) < new Date()) return false;
    if (dateFilter === "past" && new Date(e.endDate) >= new Date()) return false;
    return true;
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gray-900 py-20">
        <div className="absolute inset-0 opacity-15">
          <Image
            src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&h=600&fit=crop&q=80"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <h1 className="text-4xl md:text-5xl font-extrabold">{t("title")}</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-xl">
            {t("subtitle")}
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4 flex flex-wrap gap-3 items-center">
          <span className="text-sm font-semibold text-gray-500 mr-2">{t("filter")}</span>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 outline-none"
          >
            <option value="All">{t("allIndustries")}</option>
            {industries.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 outline-none"
          >
            <option value="All">{t("allCities")}</option>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {["all", "upcoming", "past"].map((f) => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  dateFilter === f
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {dateFilterLabels[f]}
              </button>
            ))}
          </div>
          <span className="ml-auto text-sm text-gray-400">
            {t("count", { count: filtered.length })}
          </span>
        </div>
      </section>

      {/* Exhibition Grid */}
      <section className="py-12 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          {loading && <p className="text-center py-20 text-gray-400">{t("loading")}</p>}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((expo) => (
              <Link
                key={expo.id}
                href={`/exhibitions/${expo.slug}`}
                className="group block rounded-2xl overflow-hidden bg-white shadow-md shadow-gray-200/50 card-hover"
              >
                {/* Image */}
                <div className="relative h-52 overflow-hidden bg-gray-900">
                  {/* Blurred backdrop fills the frame regardless of the poster's aspect ratio */}
                  <Image
                    src={expo.image}
                    alt=""
                    aria-hidden="true"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover blur-2xl scale-110 opacity-60 group-hover:scale-125 transition-transform duration-500"
                  />
                  {/* Full poster, never cropped, so any text/details stay readable */}
                  <Image
                    src={expo.image}
                    alt={expo.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 gradient-overlay" />
                  <FavoriteButton exhibitionId={expo.id} className="absolute top-4 right-4 z-10 w-9 h-9 text-lg shadow-md" />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="rounded-lg bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-gray-900 shadow-sm">
                      {expo.industry}
                    </span>
                    {new Date(expo.endDate) >= new Date() && (
                      <span className="rounded-lg bg-green-500/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-white shadow-sm">
                        {t("upcoming")}
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-lg font-bold text-white line-clamp-2 leading-tight drop-shadow-lg">
                      {expo.title}
                    </h3>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {expo.dates}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {expo.venue}, {expo.city}
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-4">{expo.description}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex gap-4 text-xs text-gray-400">
                      <span>🏢 {formatNumber(expo.exhibitors)}+</span>
                      <span>👥 {expo.visitors}</span>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform">
                      {t("viewDetails")}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {!loading && filtered.length === 0 && (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t("noResultsTitle")}</h3>
              <p className="text-gray-500">{t("noResultsSubtitle")}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
