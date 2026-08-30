"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { exhibitions, getIndustries, getCities } from "@/lib/exhibitions";

export default function ExhibitionsPage() {
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const industries = useMemo(getIndustries, []);
  const cities = useMemo(getCities, []);

  const filtered = useMemo(() => {
    return exhibitions.filter((e) => {
      if (industry && e.industry !== industry) return false;
      if (city && e.city !== city) return false;
      if (dateFilter === "upcoming" && new Date(e.endDate) < new Date()) return false;
      if (dateFilter === "past" && new Date(e.endDate) >= new Date()) return false;
      return true;
    });
  }, [industry, city, dateFilter]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Exhibition Schedule</h1>
        <p className="mt-2 text-gray-500">
          Browse upcoming trade shows, expos, and industry fairs.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-wrap gap-3">
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        >
          <option value="">All Industries</option>
          {industries.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>

        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        >
          <option value="">All Cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        >
          <option value="">All Dates</option>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
        </select>

        {(industry || city || dateFilter) && (
          <button
            onClick={() => {
              setIndustry("");
              setCity("");
              setDateFilter("");
            }}
            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Exhibition cards */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          No exhibitions match your filters.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((expo) => (
            <Link
              key={expo.id}
              href={`/exhibitions/${expo.slug}`}
              className="group overflow-hidden rounded-lg border border-gray-200 transition hover:shadow-lg"
            >
              {/* Color banner */}
              <div
                className="flex h-32 items-end px-5 pb-4"
                style={{ backgroundColor: expo.color }}
              >
                <span className="rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-800">
                  {expo.industry}
                </span>
              </div>

              <div className="p-5">
                <h2 className="text-lg font-semibold leading-snug group-hover:underline">
                  {expo.title}
                </h2>
                <div className="mt-3 space-y-1 text-sm text-gray-500">
                  <p className="flex items-center gap-1">
                    <span>📅</span> {expo.dates}
                  </p>
                  <p className="flex items-center gap-1">
                    <span>📍</span> {expo.city}, {expo.country}
                  </p>
                  <p className="flex items-center gap-1">
                    <span>🏢</span> {expo.venue}
                  </p>
                </div>
                <div className="mt-4 flex gap-4 text-xs text-gray-400">
                  <span>{expo.exhibitors.toLocaleString()} exhibitors</span>
                  <span>{expo.visitors} visitors</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
