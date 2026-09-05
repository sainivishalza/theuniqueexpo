"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";

interface Event {
  id: string; slug: string; title: string; category: string; city: string; venue: string;
  eventDate: string; startTime: string; price: string; image: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  networking: "🤝", hiking: "🥾", picnic: "🧺", cultural: "🏮", other: "📅",
};

export default function EventsPage() {
  const t = useTranslations("eventsPage");
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "past" ? "past" : "upcoming";
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/events?view=${view}`)
      .then((res) => res.json())
      .then((data) => setEvents(data.events || []))
      .finally(() => setLoading(false));
  }, [view]);

  return (
    <div>
      <section className="relative overflow-hidden bg-gray-900 py-20">
        <div className="absolute inset-0 opacity-15">
          <Image
            src="https://images.unsplash.com/photo-1511578314322-379afb476865?w=1600&h=600&fit=crop&q=80"
            alt="" fill priority sizes="100vw" className="object-cover"
          />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <h1 className="text-4xl md:text-5xl font-extrabold">{t("title")}</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-xl">{t("subtitle")}</p>
        </div>
      </section>

      <section className="py-12 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex gap-2 mb-8">
            <Link
              href="/events?view=upcoming"
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${view === "upcoming" ? "gradient-brand text-white shadow-md shadow-emerald-500/25" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"}`}
            >
              {t("upcoming")}
            </Link>
            <Link
              href="/events?view=past"
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${view === "past" ? "gradient-brand text-white shadow-md shadow-emerald-500/25" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"}`}
            >
              {t("past")}
            </Link>
          </div>

          {loading && <p className="text-center py-20 text-gray-400">{t("loading")}</p>}

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="group block rounded-2xl overflow-hidden bg-white shadow-md shadow-gray-200/50 card-hover"
              >
                <div className="relative h-44 overflow-hidden bg-gray-900">
                  {event.image ? (
                    <Image
                      src={event.image}
                      alt={event.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-5xl">
                      {CATEGORY_ICONS[event.category] || "📅"}
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="rounded-lg bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-gray-900 shadow-sm capitalize">
                      {CATEGORY_ICONS[event.category] || "📅"} {t(`categories.${event.category}`)}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{event.title}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {event.eventDate}{event.startTime ? ` · ${event.startTime}` : ""}
                  </div>
                  {event.city && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {event.city}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="text-sm font-bold text-gray-900">{event.price || t("free")}</div>
                    <span className="text-sm font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform">
                      {t("viewDetails")}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {!loading && events.length === 0 && (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t("noResultsTitle")}</h3>
              <p className="text-gray-500">{t("noResultsSubtitle")}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
