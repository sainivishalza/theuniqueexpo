"use client";

import { useState } from "react";
import Link from "next/link";
import { exhibitions, getIndustries, getCities } from "@/lib/exhibitions";
import { exhibitionHeroImages } from "@/lib/images";

export default function ExhibitionsPage() {
  const [industry, setIndustry] = useState("All");
  const [city, setCity] = useState("All");
  const [dateFilter, setDateFilter] = useState("all");

  const industries = getIndustries();
  const cities = getCities();

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
          <img
            src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&h=600&fit=crop&q=80"
            alt=""
            className="img-cover"
          />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <h1 className="text-4xl md:text-5xl font-extrabold">Exhibitions</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-xl">
            Discover world-class trade fairs and exhibitions across the globe.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4 flex flex-wrap gap-3 items-center">
          <span className="text-sm font-semibold text-gray-500 mr-2">Filter:</span>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 outline-none"
          >
            <option>All Industries</option>
            {industries.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 outline-none"
          >
            <option>All Cities</option>
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
                {f === "all" ? "All Dates" : f}
              </button>
            ))}
          </div>
          <span className="ml-auto text-sm text-gray-400">
            {filtered.length} exhibition{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </section>

      {/* Exhibition Grid */}
      <section className="py-12 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((expo) => (
              <Link
                key={expo.id}
                href={`/exhibitions/${expo.slug}`}
                className="group block rounded-2xl overflow-hidden bg-white shadow-md shadow-gray-200/50 card-hover"
              >
                {/* Image */}
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={exhibitionHeroImages[expo.slug]}
                    alt={expo.title}
                    className="img-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 gradient-overlay" />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="rounded-lg bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-gray-900 shadow-sm">
                      {expo.industry}
                    </span>
                    {new Date(expo.endDate) >= new Date() && (
                      <span className="rounded-lg bg-green-500/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-white shadow-sm">
                        Upcoming
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
                      <span>🏢 {expo.exhibitors.toLocaleString()}+</span>
                      <span>👥 {expo.visitors}</span>
                    </div>
                    <span className="text-sm font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                      View Details →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No exhibitions found</h3>
              <p className="text-gray-500">Try adjusting your filters to find events.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
