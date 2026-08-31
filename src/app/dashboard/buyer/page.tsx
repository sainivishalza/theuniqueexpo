"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

const actions = [
  {
    title: "Browse Exhibitions",
    description: "Discover upcoming trade shows worldwide",
    href: "/exhibitions",
    icon: "🎯",
    color: "from-teal-500 to-cyan-600",
  },
  {
    title: "Exhibitor Directory",
    description: "Search verified suppliers by industry",
    href: "/directory",
    icon: "🏢",
    color: "from-purple-500 to-purple-600",
  },
  {
    title: "Post Buy Request",
    description: "Get quotes from qualified suppliers",
    href: "/marketplace/new",
    icon: "📋",
    color: "from-emerald-500 to-green-600",
  },
  {
    title: "Marketplace",
    description: "View open RFQs and submitted quotes",
    href: "/marketplace",
    icon: "🛒",
    color: "from-orange-500 to-red-500",
  },
  {
    title: "Saved Suppliers",
    description: "Your bookmarked exhibitor profiles",
    icon: "⭐",
    color: "from-yellow-400 to-amber-500",
    comingSoon: true,
  },
  {
    title: "Meetings",
    description: "Upcoming meeting requests",
    icon: "📅",
    color: "from-pink-500 to-rose-500",
    comingSoon: true,
  },
];

export default function BuyerDashboard() {
  const { user } = useAuth();

  return (
    <div>
      {/* Hero header */}
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">🛒</div>
            <div className="text-white">
              <h1 className="text-3xl font-extrabold">Buyer Dashboard</h1>
              <p className="mt-1 text-emerald-200/80">
                Welcome back{user?.name ? `, ${user.name}` : ""}. Ready to source?
              </p>
            </div>
          </div>
          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Active RFQs", value: "0", icon: "📋" },
              { label: "Suppliers Viewed", value: "0", icon: "👀" },
              { label: "Meetings Booked", value: "0", icon: "📅" },
              { label: "Orders Placed", value: "0", icon: "✅" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/10 backdrop-blur-sm p-4 border border-white/10">
                <div className="text-sm opacity-70 mb-1">{s.icon} {s.label}</div>
                <div className="text-2xl font-extrabold text-white">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {actions.map((a) => {
              const content = (
                <div className="flex items-start gap-4 p-6 rounded-2xl bg-white border border-gray-100 shadow-sm card-hover h-full">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center text-xl flex-shrink-0`}>
                    {a.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{a.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{a.description}</p>
                    {a.comingSoon && (
                      <span className="mt-2 inline-block rounded-lg bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-400">
                        Coming soon
                      </span>
                    )}
                  </div>
                </div>
              );
              return a.href ? (
                <Link key={a.title} href={a.href}>{content}</Link>
              ) : (
                <div key={a.title}>{content}</div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
