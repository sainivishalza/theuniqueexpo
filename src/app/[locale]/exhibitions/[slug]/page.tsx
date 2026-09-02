"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lib/format";
import FavoriteButton from "@/components/FavoriteButton";

interface Exhibition {
  id: string; slug: string; title: string; dates: string; startDate: string; endDate: string;
  venue: string; city: string; country: string; industry: string; description: string;
  highlights: string[]; exhibitors: number; visitors: string; organizer: string; website: string;
  color: string; image: string; galleryImages: string[]; registrationEnabled: boolean;
}

const exhibitorLogos = [
  { name: "Pacific Foods", abbr: "PF", color: "bg-orange-500" },
  { name: "TechFlow", abbr: "TF", color: "bg-emerald-500" },
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/exhibitions/${slug}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        // The API returns the poster/gallery photos as raw base64 (the admin
        // edit form needs that to resubmit them unchanged) -- for display,
        // route any of those through the dedicated image endpoints instead,
        // so the browser gets a real cacheable image request rather than a
        // multi-hundred-KB string embedded in this page's own JS bundle.
        const expo = data.exhibition;
        // Append updatedAt as a cache-busting ?v= so a re-uploaded image
        // gets a new URL instead of colliding with the old cached one.
        setExpo({
          ...expo,
          image: expo.image?.startsWith("data:")
            ? `/api/exhibitions/${slug}/image?v=${expo.updatedAt}`
            : expo.image,
          galleryImages: (expo.galleryImages || []).map((img: string, i: number) =>
            img?.startsWith("data:") ? `/api/exhibitions/${slug}/gallery/${i}?v=${expo.updatedAt}` : img
          ),
        });
      })
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
          <Link href="/exhibitions" className="mt-4 inline-block text-emerald-600 hover:underline">
            Browse all exhibitions →
          </Link>
        </div>
      </div>
    );
  }

  const isUpcoming = new Date(expo.endDate) >= new Date();
  // Hero poster first, then gallery photos -- one combined set so the
  // lightbox's prev/next cycles through every picture for this exhibition,
  // not just the gallery ones.
  const allImages = [expo.image, ...expo.galleryImages].filter(Boolean);

  return (
    <div>
      {/* Title header — plain text, never overlaps the poster */}
      <section className="bg-gray-900 py-8 md:py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="rounded-lg bg-white/10 px-3 py-1 text-sm font-medium text-white border border-white/10">
              {expo.industry}
            </span>
            <span className="rounded-lg bg-white/10 px-3 py-1 text-sm font-medium text-white border border-white/10">
              {expo.city}, {expo.country}
            </span>
            {isUpcoming && (
              <span className="rounded-lg bg-green-500/90 px-3 py-1 text-sm font-bold text-white">
                Upcoming
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight max-w-3xl">
              {expo.title}
            </h1>
            <FavoriteButton exhibitionId={expo.id} showLabel />
          </div>
          <p className="mt-3 text-lg text-white/80 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {expo.dates}
          </p>
        </div>
      </section>

      {/* Poster — shown in full at its own proportions, never cropped or shrunk to illegibility */}
      {expo.image && (
        <section className="relative bg-gray-950 py-8 md:py-10 overflow-hidden">
          <Image
            src={expo.image}
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
              aria-label="View full-size poster"
            >
              <Image
                src={expo.image}
                alt={expo.title}
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
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">{expo.description}</p>
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

              {/* Photo gallery */}
              {expo.galleryImages && expo.galleryImages.length > 0 && (
                <div className="rounded-2xl bg-white p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900 mb-5">Photo Gallery</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {expo.galleryImages.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setLightboxIndex(allImages.indexOf(img))}
                        className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 group"
                      >
                        <Image
                          src={img}
                          alt={`${expo.title} photo ${i + 1}`}
                          fill
                          sizes="(max-width: 640px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:underline"
                >
                  View all exhibitors →
                </Link>
              </div>
            </div>

            {/* Right: sidebar */}
            <div className="space-y-6">
              {/* Buyer/Visitor registration CTA */}
              {expo.registrationEnabled && (
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Register to Attend</h3>
                  <p className="text-sm text-gray-500 mb-5">Buyers and visitors must register separately for this exhibition.</p>
                  <Link
                    href={`/exhibitions/${expo.slug}/register`}
                    className="block w-full text-center rounded-xl gradient-brand py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                  >
                    Register as Buyer / Visitor
                  </Link>
                </div>
              )}

              {/* Booking CTA */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Book Your Booth</h3>
                <p className="text-sm text-gray-500 mb-5">Secure your space at this premier exhibition. Booths start from $2,500.</p>
                {isUpcoming ? (
                  <Link
                    href={`/exhibitions/${expo.slug}/floor-plan`}
                    className="block w-full text-center rounded-xl gradient-brand py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] transition-all duration-200"
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
                  <Image
                    src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=200&fit=crop&q=80"
                    alt="Hotels"
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="object-cover"
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

      {/* Poster / gallery lightbox -- covers the hero poster and every
          gallery photo as one browsable set. Pinch-to-zoom works natively
          here since the site doesn't restrict viewport scaling; this modal
          just needs to actually show the image at full size, which the
          poster previously never did (no click handler at all). */}
      {lightboxIndex !== null && allImages[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white text-xl flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label="Close"
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
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}
          <Image
            src={allImages[lightboxIndex]}
            alt={`${expo.title} photo ${lightboxIndex + 1}`}
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
              aria-label="Next photo"
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  );
}
