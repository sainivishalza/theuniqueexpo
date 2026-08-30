"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { formatNumber } from "@/lib/format";

interface Exhibition {
  id: string; slug: string; title: string; dates: string; startDate: string; endDate: string;
  venue: string; city: string; country: string; industry: string; description: string;
  highlights: string[]; exhibitors: number; visitors: string; organizer: string; website: string;
  color: string; image: string;
}

const exhibitorLogos = [
  { name: "Pacific Foods", abbr: "PF", color: "bg-orange-500" },
  { name: "TechFlow", abbr: "TF", color: "bg-blue-500" },
  { name: "GlobalParts", abbr: "GP", color: "bg-green-500" },
  { name: "Industrial Co", abbr: "IC", color: "bg-purple-500" },
  { name: "TradeLink", abbr: "TL", color: "bg-red-500" },
  { name: "SupplyPro", abbr: "SP", color: "bg-teal-500" },
];

export default function ExhibitionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [expo, setExpo] = useState<Exhibition | null | undefined>(undefined);

  useEffect(() => {
    fetch(`/api/exhibitions/${slug}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setExpo(data.exhibition))
      .catch(() => setExpo(null));
  }, [slug]);

  if (expo === undefined) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-400">Loading...</div>;
  }

  if (!expo) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900">Exhibition not found</h1>
          <Link href="/exhibitions" className="mt-4 inline-block text-blue-600 hover:underline">
            Browse all exhibitions →
          </Link>
        </div>
      </div>
    );
  }

  const isUpcoming = new Date(expo.endDate) >= new Date();

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative h-[420px] md:h-[480px] overflow-hidden">
        <img
          src={expo.image}
          alt={expo.title}
          className="img-cover"
        />
        <div className="absolute inset-0 gradient-overlay" />

        {/* Content overlay */}
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto max-w-7xl px-6 pb-10 w-full">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="rounded-lg bg-white/20 backdrop-blur-sm px-3 py-1 text-sm font-medium text-white border border-white/10">
                {expo.industry}
              </span>
              <span className="rounded-lg bg-white/20 backdrop-blur-sm px-3 py-1 text-sm font-medium text-white border border-white/10">
                {expo.city}, {expo.country}
              </span>
              {isUpcoming && (
                <span className="rounded-lg bg-green-500/90 px-3 py-1 text-sm font-bold text-white">
                  Upcoming
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white text-shadow-lg leading-tight max-w-3xl">
              {expo.title}
            </h1>
            <p className="mt-3 text-lg text-white/80 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {expo.dates}
            </p>
          </div>
        </div>
      </section>

      {/* Quick stats bar */}
      <section className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "Exhibitors", value: formatNumber(expo.exhibitors) + "+", icon: "🏢" },
            { label: "Visitors", value: expo.visitors, icon: "👥" },
            { label: "Venue", value: expo.city, icon: "📍" },
            { label: "Duration", value: expo.dates, icon: "📅" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg">{s.icon}</div>
              <div>
                <div className="text-xs text-gray-400">{s.label}</div>
                <div className="text-sm font-bold text-gray-900">{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left: main content */}
            <div className="lg:col-span-2 space-y-8">
              {/* About */}
              <div className="rounded-2xl bg-white p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Exhibition</h2>
                <p className="text-gray-600 leading-relaxed">{expo.description}</p>
              </div>

              {/* Highlights */}
              <div className="rounded-2xl bg-white p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-5">Event Highlights</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {expo.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <span className="text-sm text-gray-700 pt-1">{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exhibitor preview */}
              <div className="rounded-2xl bg-white p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-5">Featured Exhibitors</h2>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                  {exhibitorLogos.map((e) => (
                    <div key={e.name} className="flex flex-col items-center gap-2 group cursor-pointer">
                      <div className={`w-14 h-14 rounded-xl ${e.color} flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform shadow-sm`}>
                        {e.abbr}
                      </div>
                      <span className="text-xs text-gray-500 text-center group-hover:text-gray-900 transition-colors">{e.name}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/directory"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline"
                >
                  View all exhibitors →
                </Link>
              </div>
            </div>

            {/* Right: sidebar */}
            <div className="space-y-6">
              {/* Booking CTA */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Book Your Booth</h3>
                <p className="text-sm text-gray-500 mb-5">Secure your space at this premier exhibition. Booths start from $2,500.</p>
                {isUpcoming ? (
                  <Link
                    href={`/exhibitions/${expo.slug}/floor-plan`}
                    className="block w-full text-center rounded-xl gradient-brand py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] transition-all duration-200"
                  >
                    View Floor Plan & Book
                  </Link>
                ) : (
                  <div className="block w-full text-center rounded-xl bg-gray-200 py-3 text-sm font-semibold text-gray-500">
                    This exhibition has ended
                  </div>
                )}
              </div>

              {/* Hotels */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Hotels Nearby</h3>
                <div className="relative h-32 rounded-xl overflow-hidden mb-4">
                  <img
                    src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=200&fit=crop&q=80"
                    alt="Hotels"
                    className="img-cover"
                  />
                  <div className="absolute inset-0 gradient-overlay-light" />
                  <div className="absolute bottom-2 left-3 text-xs font-semibold text-white bg-black/40 backdrop-blur-sm rounded px-2 py-1">
                    12 partner hotels
                  </div>
                </div>
                <Link
                  href={`/exhibitions/${expo.slug}/hotels`}
                  className="block w-full text-center rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Browse Hotels
                </Link>
              </div>

              {/* Share */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Share This Event</h3>
                <div className="flex gap-2">
                  {["𝕏", "in", "f", "✉"].map((icon, i) => (
                    <button
                      key={i}
                      className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Organizer */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Organized by</h3>
                <p className="text-sm text-gray-500">{expo.organizer}</p>
                <a
                  href={expo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block text-center rounded-xl border border-gray-200 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Official Website ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
