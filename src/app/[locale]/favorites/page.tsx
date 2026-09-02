"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import FavoriteButton from "@/components/FavoriteButton";

interface Exhibition {
  id: string;
  slug: string;
  title: string;
  dates: string;
  venue: string;
  city: string;
  country: string;
  industry: string;
  color: string;
  image: string;
}

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch("/api/favorites")
      .then((res) => (res.ok ? res.json() : { exhibitions: [] }))
      .then((data) => setExhibitions(data.exhibitions || []))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">❤️</div>
          <h1 className="text-xl font-bold text-gray-900">Log in to see your saved exhibitions</h1>
          <Link href="/login" className="mt-3 inline-block text-emerald-600 hover:underline text-sm font-semibold">Log in →</Link>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Saved Exhibitions</h1>
      <p className="mt-1 text-sm text-gray-500">Exhibitions you've bookmarked for later.</p>

      {loading && <p className="mt-10 text-center text-gray-400">Loading...</p>}

      {!loading && exhibitions.length === 0 && (
        <div className="mt-16 text-center">
          <div className="text-5xl mb-4">🤍</div>
          <p className="text-gray-400">No saved exhibitions yet.</p>
          <Link href="/exhibitions" className="mt-3 inline-block text-emerald-600 hover:underline text-sm font-semibold">Browse exhibitions →</Link>
        </div>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {exhibitions.map((expo) => (
          <Link
            key={expo.id}
            href={`/exhibitions/${expo.slug}`}
            className="group block rounded-2xl overflow-hidden bg-white shadow-md shadow-gray-200/50 card-hover"
          >
            <div className="relative h-40 overflow-hidden bg-gray-900">
              {expo.image && (
                <Image
                  src={expo.image}
                  alt={expo.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              )}
              <FavoriteButton
                exhibitionId={expo.id}
                initialSaved
                onChange={(saved) => {
                  if (!saved) setExhibitions((prev) => prev.filter((e) => e.id !== expo.id));
                }}
                className="absolute top-3 right-3 z-10 w-9 h-9 text-lg shadow-md"
              />
            </div>
            <div className="p-4">
              <h3 className="font-bold text-gray-900 truncate">{expo.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{expo.dates}</p>
              <p className="text-xs text-gray-400 mt-0.5">{expo.venue}, {expo.city}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
