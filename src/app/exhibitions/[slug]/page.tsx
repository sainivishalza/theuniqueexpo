"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { getExhibitionById } from "@/lib/exhibitions";

export default function ExhibitionDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const expo = getExhibitionById(slug);

  if (!expo) {
    return (
      <main className="flex min-h-[calc(100vh-52px)] flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Exhibition not found</h1>
        <Link href="/exhibitions" className="mt-4 text-sm text-gray-500 hover:underline">
          ← Back to exhibitions
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/exhibitions" className="text-sm text-gray-500 hover:underline">
        ← Back to exhibitions
      </Link>

      {/* Hero banner */}
      <div
        className="mt-6 flex h-48 items-end rounded-lg px-6 pb-6"
        style={{ backgroundColor: expo.color }}
      >
        <span className="rounded bg-white/90 px-3 py-1 text-sm font-medium text-gray-800">
          {expo.industry}
        </span>
      </div>

      <h1 className="mt-8 text-3xl font-bold">{expo.title}</h1>

      {/* Key details grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <DetailRow label="Dates" value={expo.dates} />
        <DetailRow label="Venue" value={expo.venue} />
        <DetailRow label="City" value={`${expo.city}, ${expo.country}`} />
        <DetailRow label="Organizer" value={expo.organizer} />
        <DetailRow label="Exhibitors" value={`${expo.exhibitors.toLocaleString()}+`} />
        <DetailRow label="Expected Visitors" value={expo.visitors} />
      </div>

      {/* Description */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold">About this Exhibition</h2>
        <p className="mt-3 leading-relaxed text-gray-600">{expo.description}</p>
      </div>

      {/* Highlights */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold">Highlights</h2>
        <ul className="mt-3 space-y-2">
          {expo.highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-2 text-gray-600">
              <span className="mt-1 text-green-600">✓</span>
              {h}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="mt-10 flex gap-4">
        <Link
          href="/register"
          className="rounded bg-black px-6 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Register as Exhibitor
        </Link>
        <Link
          href="/register"
          className="rounded border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Register as Buyer
        </Link>
      </div>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-gray-200 px-4 py-3">
      <div className="text-xs font-medium text-gray-400">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}
