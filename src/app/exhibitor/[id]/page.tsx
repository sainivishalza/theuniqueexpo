"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { mockExhibitorProfiles } from "@/lib/booths";

export default function ExhibitorProfilePage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const profile = mockExhibitorProfiles.find((p) => p.id === id || p.slug === id);

  if (!profile) {
    return (
      <main className="flex min-h-[calc(100vh-52px)] items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Exhibitor profile not found.</p>
          <Link href="/exhibitions" className="mt-2 text-sm text-gray-500 hover:underline">
            ← Browse exhibitions
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/exhibitions" className="text-sm text-gray-500 hover:underline">
        ← Back to exhibitions
      </Link>

      {/* Header */}
      <div className="mt-6 rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{profile.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {profile.industry} • {profile.country}
            </p>
          </div>
          <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Verified Supplier
          </span>
        </div>
        <p className="mt-4 text-gray-600">{profile.description}</p>
      </div>

      {/* Products */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold">Products & Services</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {profile.products.map((p) => (
            <span
              key={p}
              className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-700"
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Certifications */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold">Certifications</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {profile.certifications.map((c) => (
            <span
              key={c}
              className="rounded bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex gap-3">
        <Link
          href="/register"
          className="rounded bg-black px-5 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Request Meeting
        </Link>
        <Link
          href="/register"
          className="rounded border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Send RFQ
        </Link>
      </div>
    </main>
  );
}
