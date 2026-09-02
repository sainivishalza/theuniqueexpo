"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { mockExhibitorProfiles } from "@/lib/booths";

interface ReviewSummary {
  average: number;
  count: number;
}

const avatarColors = [
  "from-emerald-500 to-emerald-600",
  "from-green-500 to-emerald-600",
  "from-purple-500 to-violet-600",
  "from-orange-500 to-red-500",
  "from-pink-500 to-rose-500",
  "from-teal-500 to-cyan-500",
];

export default function DirectoryPage() {
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("");
  const [reviewSummaries, setReviewSummaries] = useState<Record<string, ReviewSummary>>({});

  const industries = useMemo(
    () => [...new Set(mockExhibitorProfiles.map((e) => e.industry))].sort(),
    []
  );

  useEffect(() => {
    const slugs = mockExhibitorProfiles.map((e) => e.slug).join(",");
    fetch(`/api/exhibitors/reviews-summary?slugs=${encodeURIComponent(slugs)}`)
      .then((res) => (res.ok ? res.json() : { summaries: {} }))
      .then((data) => setReviewSummaries(data.summaries || {}))
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return mockExhibitorProfiles.filter((e) => {
      if (industry && e.industry !== industry) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          e.name.toLowerCase().includes(q) ||
          e.products.some((p) => p.toLowerCase().includes(q)) ||
          e.country.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [search, industry]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gray-900 py-20">
        <div className="absolute inset-0 opacity-15">
          <Image
            src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=1600&h=600&fit=crop&q=80"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <h1 className="text-4xl md:text-5xl font-extrabold">Exhibitor Directory</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-xl">
            Search verified suppliers and exhibitors across all exhibitions.
          </p>
        </div>
      </section>

      {/* Search & filters */}
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, product, or country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
            />
          </div>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 focus:border-emerald-500 outline-none"
          >
            <option value="">All Industries</option>
            {industries.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
          <span className="text-sm text-gray-400">
            {filtered.length} exhibitor{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </section>

      {/* Results */}
      <section className="py-12 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.length === 0 ? (
              <div className="col-span-full text-center py-20">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No exhibitors found</h3>
                <p className="text-gray-500">Try a different search or filter.</p>
              </div>
            ) : (
              filtered.map((ex, idx) => (
                <Link
                  key={ex.id}
                  href={`/exhibitor/${ex.id}`}
                  className="group block rounded-2xl bg-white p-6 shadow-sm border border-gray-100 card-hover"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                      {ex.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900 group-hover:text-emerald-600 transition-colors truncate">
                          {ex.name}
                        </h2>
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700 flex-shrink-0">
                          ✓ Verified
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {ex.industry} • {ex.country}
                      </p>
                      {reviewSummaries[ex.slug]?.count > 0 && (
                        <p className="text-xs text-amber-600 font-semibold mt-1">
                          ★ {reviewSummaries[ex.slug].average} ({reviewSummaries[ex.slug].count} review{reviewSummaries[ex.slug].count === 1 ? "" : "s"})
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-gray-600 line-clamp-2 leading-relaxed">
                    {ex.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {ex.products.slice(0, 4).map((p) => (
                      <span
                        key={p}
                        className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                      >
                        {p}
                      </span>
                    ))}
                    {ex.products.length > 4 && (
                      <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
                        +{ex.products.length - 4} more
                      </span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
