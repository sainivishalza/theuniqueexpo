"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { mockExhibitorProfiles } from "@/lib/booths";

export default function DirectoryPage() {
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("");

  const industries = useMemo(
    () => [...new Set(mockExhibitorProfiles.map((e) => e.industry))].sort(),
    []
  );

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
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-bold">Exhibitor Directory</h1>
      <p className="mt-2 text-gray-500">
        Search verified suppliers and exhibitors across all exhibitions.
      </p>

      {/* Search & filters */}
      <div className="mt-6 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by name, product, or country..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        />
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
      </div>

      {/* Results */}
      <div className="mt-8 space-y-4">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            No exhibitors match your search.
          </div>
        ) : (
          filtered.map((ex) => (
            <Link
              key={ex.id}
              href={`/exhibitor/${ex.id}`}
              className="block rounded-lg border border-gray-200 p-5 transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold hover:underline">{ex.name}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {ex.industry} • {ex.country}
                  </p>
                </div>
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  Verified
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600 line-clamp-2">{ex.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ex.products.slice(0, 4).map((p) => (
                  <span
                    key={p}
                    className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
