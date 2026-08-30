"use client";

import { useAuth } from "@/lib/auth-context";
import { exhibitions } from "@/lib/exhibitions";
import Link from "next/link";
import { exhibitionHeroImages } from "@/lib/images";

export default function AdminExhibitionsPage() {
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-500">Access denied. Admin only.</p>
      </div>
    );
  }

  return (
    <div>
      <section className="bg-gray-900 py-8">
        <div className="mx-auto max-w-7xl px-6">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to admin
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-extrabold text-white">Exhibition Management</h1>
            <button className="rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
              + New Exhibition
            </button>
          </div>
        </div>
      </section>

      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 space-y-4">
          {exhibitions.map((expo) => (
            <div key={expo.id} className="flex items-center gap-5 rounded-2xl bg-white p-5 shadow-sm border border-gray-100 card-hover">
              <div className="w-20 h-14 rounded-xl overflow-hidden flex-shrink-0">
                <img src={exhibitionHeroImages[expo.slug]} alt={expo.title} className="img-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-gray-900 truncate">{expo.title}</h2>
                <p className="text-sm text-gray-500">{expo.dates} • {expo.city} • {expo.exhibitors} exhibitors</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/exhibitions/${expo.slug}`} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">View</Link>
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Edit</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
