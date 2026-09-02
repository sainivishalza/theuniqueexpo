"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

interface Tour {
  id: string; slug: string; title: string; dates: string; startDate: string; endDate: string;
  duration: string; departureCity: string; destination: string; description: string;
  highlights: string[]; price: string; currency: string; groupSize: string; organizer: string;
  color: string; image: string; galleryImages: string[]; registrationEnabled: boolean;
}

export default function TourDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations("tourDetail");
  const locale = useLocale();
  const { slug } = use(params);
  const [tour, setTour] = useState<Tour | null | undefined>(undefined);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/tours/${slug}?locale=${locale}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const tour = data.tour;
        // Same reasoning as the exhibition detail page: route uploaded
        // (base64) images through the dedicated, cacheable endpoints
        // instead of embedding raw data URLs, with a cache-busting ?v=
        // tied to the last edit so a re-upload isn't served stale.
        setTour({
          ...tour,
          image: tour.image?.startsWith("data:")
            ? `/api/tours/${slug}/image?v=${tour.updatedAt}`
            : tour.image,
          galleryImages: (tour.galleryImages || []).map((img: string, i: number) =>
            img?.startsWith("data:") ? `/api/tours/${slug}/gallery/${i}?v=${tour.updatedAt}` : img
          ),
        });
      })
      .catch(() => setTour(null));
  }, [slug, locale]);

  if (tour === undefined) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-400">{t("loading")}</div>;
  }

  if (!tour) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900">{t("notFound")}</h1>
          <Link href="/tours" className="mt-4 inline-block text-emerald-600 hover:underline">
            {t("browseAll")}
          </Link>
        </div>
      </div>
    );
  }

  const allImages = [tour.image, ...tour.galleryImages].filter(Boolean);

  return (
    <div>
      {/* Title header */}
      <section className="bg-gray-900 py-8 md:py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="rounded-lg bg-white/10 px-3 py-1 text-sm font-medium text-white border border-white/10">
              {tour.duration}
            </span>
            <span className="rounded-lg bg-white/10 px-3 py-1 text-sm font-medium text-white border border-white/10">
              {tour.departureCity} → {tour.destination}
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight max-w-3xl">
            {tour.title}
          </h1>
          <p className="mt-3 text-lg text-white/80 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {tour.dates}
          </p>
        </div>
      </section>

      {/* Poster */}
      {tour.image && (
        <section className="relative bg-gray-950 py-8 md:py-10 overflow-hidden">
          <Image
            src={tour.image}
            alt=""
            aria-hidden="true"
            fill
            sizes="100vw"
            className="object-cover blur-3xl scale-110 opacity-25"
          />
          <div className="relative mx-auto max-w-4xl px-6 flex justify-center">
            <button
              type="button"
              onClick={() => setLightboxIndex(0)}
              className="relative group cursor-zoom-in"
              aria-label={t("viewFullSizePhoto")}
            >
              <Image
                src={tour.image}
                alt={tour.title}
                width={1200}
                height={900}
                sizes="(max-width: 768px) 100vw, 800px"
                className="max-w-full max-h-[75vh] w-auto h-auto rounded-xl shadow-2xl"
                priority
              />
              <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity w-12 h-12 rounded-full bg-white/90 flex items-center justify-center text-2xl">
                  🔍
                </div>
              </div>
            </button>
          </div>
        </section>
      )}

      {/* Quick stats */}
      <section className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: t("stats.price"), value: t("pricePerPerson", { currency: tour.currency, price: tour.price }), icon: "💰" },
            { label: t("stats.duration"), value: tour.duration, icon: "📅" },
            { label: t("stats.groupSize"), value: tour.groupSize, icon: "👥" },
            { label: t("stats.route"), value: `${tour.departureCity} → ${tour.destination}`, icon: "🧭" },
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
            <div className="lg:col-span-2 space-y-8">
              <div className="rounded-2xl bg-white p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("aboutThisTour")}</h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">{tour.description}</p>
              </div>

              {tour.highlights.length > 0 && (
                <div className="rounded-2xl bg-white p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900 mb-5">{t("tourHighlights")}</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {tour.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {i + 1}
                        </div>
                        <span className="text-sm text-gray-700 pt-1">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tour.galleryImages && tour.galleryImages.length > 0 && (
                <div className="rounded-2xl bg-white p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900 mb-5">{t("photoGallery")}</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {tour.galleryImages.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setLightboxIndex(allImages.indexOf(img))}
                        className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 group"
                      >
                        <Image
                          src={img}
                          alt={`${tour.title} photo ${i + 1}`}
                          fill
                          sizes="(max-width: 640px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{t("bookThisTour")}</h3>
                <p className="text-sm text-gray-500 mb-5">
                  {tour.registrationEnabled
                    ? t("bookThisTourHint")
                    : t("registrationClosed")}
                </p>
                {tour.registrationEnabled ? (
                  <Link
                    href={`/tours/${tour.slug}/register`}
                    className="block w-full text-center rounded-xl gradient-brand py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                  >
                    {t("registerForThisTour")}
                  </Link>
                ) : (
                  <div className="block w-full text-center rounded-xl bg-gray-200 py-3 text-sm font-semibold text-gray-500">
                    {t("registrationClosed")}
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-2">{t("organizedBy")}</h3>
                <p className="text-sm text-gray-500">{tour.organizer}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightboxIndex !== null && allImages[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white text-xl flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label={t("close")}
          >
            ×
          </button>
          {allImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i === null ? null : (i - 1 + allImages.length) % allImages.length));
              }}
              className="absolute left-4 w-10 h-10 rounded-full bg-white/10 text-white text-xl flex items-center justify-center hover:bg-white/20 transition-colors"
              aria-label={t("previousPhoto")}
            >
              ‹
            </button>
          )}
          <Image
            src={allImages[lightboxIndex]}
            alt={`${tour.title} photo ${lightboxIndex + 1}`}
            width={1200}
            height={900}
            sizes="100vw"
            className="max-w-full max-h-[85vh] w-auto h-auto rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {allImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i === null ? null : (i + 1) % allImages.length));
              }}
              className="absolute right-4 w-10 h-10 rounded-full bg-white/10 text-white text-xl flex items-center justify-center hover:bg-white/20 transition-colors"
              aria-label={t("nextPhoto")}
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  );
}
