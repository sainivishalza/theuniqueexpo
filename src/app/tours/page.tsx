"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface Tour {
  id: string; slug: string; title: string; dates: string; startDate: string; endDate: string;
  duration: string; departureCity: string; destination: string; description: string;
  price: string; currency: string; groupSize: string; color: string; image: string;
}

export default function ToursPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tours")
      .then((res) => res.json())
      .then((data) => setTours(data.tours || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gray-900 py-20">
        <div className="absolute inset-0 opacity-15">
          <Image
            src="https://images.unsplash.com/photo-1549167008-f02ad8abf052?w=1600&h=600&fit=crop&q=80"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <h1 className="text-4xl md:text-5xl font-extrabold">Tours</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-xl">
            Guided travel tours across China and beyond — tell us who's going and what you love, and we'll tailor the trip.
          </p>
        </div>
      </section>

      {/* Tours Grid */}
      <section className="py-12 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          {loading && <p className="text-center py-20 text-gray-400">Loading tours...</p>}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {tours.map((tour) => (
              <Link
                key={tour.id}
                href={`/tours/${tour.slug}`}
                className="group block rounded-2xl overflow-hidden bg-white shadow-md shadow-gray-200/50 card-hover"
              >
                <div className="relative h-52 overflow-hidden bg-gray-900">
                  {tour.image && (
                    <>
                      <Image
                        src={tour.image}
                        alt=""
                        aria-hidden="true"
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover blur-2xl scale-110 opacity-60 group-hover:scale-125 transition-transform duration-500"
                      />
                      <Image
                        src={tour.image}
                        alt={tour.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-contain group-hover:scale-105 transition-transform duration-500"
                      />
                    </>
                  )}
                  <div className="absolute inset-0 gradient-overlay" />
                  <div className="absolute top-4 left-4">
                    <span className="rounded-lg bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-gray-900 shadow-sm">
                      {tour.duration}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-lg font-bold text-white line-clamp-2 leading-tight drop-shadow-lg">
                      {tour.title}
                    </h3>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {tour.dates}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {tour.departureCity} → {tour.destination}
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-4">{tour.description}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="text-sm font-bold text-gray-900">
                      {tour.currency}{tour.price} <span className="font-normal text-gray-400">/ person</span>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform">
                      View Details →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {!loading && tours.length === 0 && (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🧳</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No tours yet</h3>
              <p className="text-gray-500">Check back soon for upcoming travel tours.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
