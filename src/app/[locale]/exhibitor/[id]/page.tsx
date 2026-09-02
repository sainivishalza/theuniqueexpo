"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { mockExhibitorProfiles } from "@/lib/booths";
import ExhibitorReviews from "@/components/ExhibitorReviews";

const avatarColors = [
  "from-emerald-500 to-emerald-600",
  "from-green-500 to-emerald-600",
  "from-purple-500 to-violet-600",
  "from-orange-500 to-red-500",
  "from-pink-500 to-rose-500",
  "from-teal-500 to-cyan-500",
];

export default function ExhibitorProfilePage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const profile = mockExhibitorProfiles.find((p) => p.id === id || p.slug === id);

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900">Exhibitor not found</h1>
          <Link href="/exhibitions" className="mt-4 inline-block text-emerald-600 hover:underline">Browse exhibitions →</Link>
        </div>
      </div>
    );
  }

  const colorIndex = mockExhibitorProfiles.indexOf(profile) % avatarColors.length;

  return (
    <div>
      {/* Hero */}
      <section className="relative h-56 bg-gray-900 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1400&h=300&fit=crop&q=80"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-30"
        />
        <div className="absolute inset-0 gradient-overlay" />
      </section>

      {/* Profile header */}
      <section className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-6 -mt-12 relative z-10">
          <div className="flex items-end gap-6">
            <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${avatarColors[colorIndex]} flex items-center justify-center text-white text-3xl font-bold shadow-xl border-4 border-white`}>
              {profile.name[0]}
            </div>
            <div className="pb-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold text-gray-900">{profile.name}</h1>
                <span className="rounded-lg bg-green-100 px-3 py-1 text-xs font-bold text-green-700 border border-green-200">
                  ✓ Verified Supplier
                </span>
              </div>
              <p className="text-gray-500 mt-1">{profile.industry} • {profile.country}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main */}
            <div className="lg:col-span-2 space-y-8">
              {/* About */}
              <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
                <p className="text-gray-600 leading-relaxed">{profile.description}</p>
              </div>

              {/* Products */}
              <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-5">Products & Services</h2>
                <div className="grid grid-cols-2 gap-3">
                  {profile.products.map((p) => (
                    <div key={p} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">✦</div>
                      <span className="text-sm font-medium text-gray-700">{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Certifications */}
              <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-5">Certifications</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.certifications.map((c) => (
                    <span key={c} className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
                      🏆 {c}
                    </span>
                  ))}
                </div>
              </div>

              <ExhibitorReviews slug={profile.slug} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Actions */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Connect</h3>
                <Link
                  href="/register"
                  className="block w-full text-center rounded-xl gradient-brand py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                >
                  Request Meeting
                </Link>
                <Link
                  href="/marketplace/new"
                  className="mt-3 block w-full text-center rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Send RFQ
                </Link>
              </div>

              {/* Quick facts */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Quick Facts</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Industry</span>
                    <span className="font-semibold text-gray-900">{profile.industry}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Country</span>
                    <span className="font-semibold text-gray-900">{profile.country}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Products</span>
                    <span className="font-semibold text-gray-900">{profile.products.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Certs</span>
                    <span className="font-semibold text-gray-900">{profile.certifications.length}</span>
                  </div>
                </div>
              </div>

              {/* Share */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Share Profile</h3>
                <div className="flex gap-2">
                  {["𝕏", "in", "f", "✉"].map((icon, i) => (
                    <button key={i} className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors text-sm">
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
