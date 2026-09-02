"use client";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { businessTours, chinaTours } from "@/lib/tours";
import { subsidies } from "@/lib/subsidies";

export default function AdminServicesPage() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ tourApps: 0, visaApps: 0, consultations: 0 });

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    Promise.all([
      fetch("/api/admin/tour-applications").then((r) => r.json()),
      fetch("/api/admin/visa-applications").then((r) => r.json()),
      fetch("/api/admin/consultations").then((r) => r.json()),
    ]).then(([tourData, visaData, consultData]) => {
      setCounts({
        tourApps: (tourData.applications || []).length,
        visaApps: (visaData.applications || []).length,
        consultations: (consultData.bookings || []).length,
      });
    });
  }, [user]);

  if (!user || user.role !== "admin") return <div className="min-h-[60vh] flex items-center justify-center"><div className="text-center"><div className="text-6xl mb-4">🔒</div><h1 className="text-2xl font-bold">Access Denied</h1><p className="text-gray-500 mt-2">Admin privileges required.</p><p className="text-xs text-gray-400 mt-1">Tip: login with admin@theuniqueexpo.com</p></div></div>;

  const sections = [
    { title: "Business Tours", description: "Manage tour packages tied to exhibitions.", href: "/admin/services/tours", icon: "✈️", color: "from-amber-500 to-yellow-600", count: businessTours.length + chinaTours.length },
    { title: "Tour Applications", description: "Review and manage tour booking applications.", href: "/admin/services/tour-applications", icon: "📝", color: "from-purple-500 to-purple-600", count: counts.tourApps },
    { title: "Visa & Setup Applications", description: "Review company setup and visa applications.", href: "/admin/services/visa-applications", icon: "📋", color: "from-emerald-500 to-green-600", count: counts.visaApps },
    { title: "Transport Subsidies", description: "Manage exhibition travel subsidies.", href: "/admin/services/subsidies", icon: "🚌", color: "from-cyan-500 to-teal-600", count: subsidies.length },
    { title: "Consultation Requests", description: "Review and schedule consultation bookings.", href: "/admin/services/consultations", icon: "💬", color: "from-orange-500 to-red-500", count: counts.consultations },
  ];

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">🛠️</div>
            <div className="text-white">
              <h1 className="text-3xl font-extrabold">Services Management</h1>
              <p className="mt-1 text-emerald-200/80">Manage tours, applications, subsidies, and consultations.</p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
            {sections.map((s) => (
              <div key={s.title} className="rounded-xl bg-white/10 backdrop-blur-sm p-4 border border-white/10">
                <div className="text-sm opacity-70 mb-1">{s.icon} {s.title}</div>
                <div className="text-2xl font-extrabold text-white">{s.count}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => (
            <Link key={s.title} href={s.href} className="flex items-start gap-4 p-6 rounded-2xl bg-white border border-gray-100 shadow-sm card-hover">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-xl flex-shrink-0`}>{s.icon}</div>
              <div>
                <h3 className="font-bold text-gray-900">{s.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{s.description}</p>
                <span className="mt-2 inline-block rounded-lg bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">{s.count} items</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
