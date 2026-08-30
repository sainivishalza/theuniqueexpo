"use client";
import Link from "next/link";
import { chinaTours } from "@/lib/tours";
import { formatNumber } from "@/lib/format";

export default function ChinaToursPage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gray-900 py-20">
        <div className="absolute inset-0 opacity-15"><img src="https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=1600&h=600&fit=crop&q=80" alt="" className="img-cover" /></div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <p className="text-blue-300 font-semibold mb-2">Our Services</p>
          <h1 className="text-4xl md:text-5xl font-extrabold">Tours of China</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-2xl">Curated tour packages covering China major cities, trade hubs, and cultural landmarks.</p>
        </div>
      </section>
      <section className="py-12 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-2">
            {chinaTours.map((tour) => (
              <Link key={tour.id} href={"/services/china-tours/" + tour.slug} className="group block rounded-2xl overflow-hidden bg-white shadow-md card-hover">
                <div className="relative h-64 overflow-hidden">
                  <img src={tour.image} alt={tour.title} className="img-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 gradient-overlay" />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="rounded-lg bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-gray-900">{tour.city}</span>
                    <span className="rounded-lg bg-red-500/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-white">{tour.duration}</span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-bold text-white drop-shadow-lg">{tour.title}</h3>
                    <p className="text-sm text-white/80 mt-1">{tour.dates}</p>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-400 line-clamp-2 mb-4">{tour.description}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="text-xl font-extrabold text-gray-900">${formatNumber(tour.price)} <span className="text-sm font-normal text-gray-400">USD</span></div>
                    <span className="text-sm font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">View Details →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
