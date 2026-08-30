"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { exhibitions } from "@/lib/exhibitions";
import { getRFQs } from "@/lib/rfq";
import { getAllHotelBookings } from "@/lib/hotels";

export default function AdminPage() {
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-500">Admin privileges required.</p>
          <p className="mt-1 text-xs text-gray-400">Tip: login with admin@expobridge.com</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline text-sm font-semibold">Go home →</Link>
        </div>
      </div>
    );
  }

  const rfqs = getRFQs();
  const hotelBookings = getAllHotelBookings();

  const sections = [
    { title: "Exhibition Management", description: "Create, edit, and manage exhibition listings and floor plans.", href: "/admin/exhibitions", icon: "🎪", color: "from-blue-500 to-blue-600" },
    { title: "RFQ Review", description: "View and moderate all buy requests and submitted quotes.", href: "/admin/rfqs", icon: "📋", color: "from-purple-500 to-purple-600" },
    { title: "Hotel Bookings", description: "Review and confirm hotel booking requests from buyers.", href: "/admin/hotels", icon: "🏨", color: "from-emerald-500 to-green-600" },
    { title: "Services Management", description: "Manage tours, applications, subsidies, and consultations.", href: "/admin/services", icon: "🛠️", color: "from-violet-500 to-purple-600" },
    { title: "User Management", description: "Manage user accounts, roles, and verification status.", icon: "👥", color: "from-orange-500 to-red-500", comingSoon: true },
  ];

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">⚙️</div>
            <div className="text-white">
              <h1 className="text-3xl font-extrabold">Admin Back Office</h1>
              <p className="mt-1 text-blue-200/80">Manage exhibitions, bookings, RFQs, and users.</p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Exhibitions", value: exhibitions.length, icon: "🎪" },
              { label: "Open RFQs", value: rfqs.filter(r => r.status === "open").length, icon: "📋" },
              { label: "Hotel Bookings", value: hotelBookings.length, icon: "🏨" },
              { label: "Total RFQs", value: rfqs.length, icon: "📊" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/10 backdrop-blur-sm p-4 border border-white/10">
                <div className="text-sm opacity-70 mb-1">{s.icon} {s.label}</div>
                <div className="text-2xl font-extrabold text-white">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 grid gap-5 sm:grid-cols-2">
          {sections.map((s) => {
            const content = (
              <div className="flex items-start gap-4 p-6 rounded-2xl bg-white border border-gray-100 shadow-sm card-hover h-full">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-xl flex-shrink-0`}>
                  {s.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{s.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{s.description}</p>
                  {s.comingSoon && <span className="mt-2 inline-block rounded-lg bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-400">Coming soon</span>}
                </div>
              </div>
            );
            return s.href ? <Link key={s.title} href={s.href}>{content}</Link> : <div key={s.title}>{content}</div>;
          })}
        </div>
      </section>
    </div>
  );
}
