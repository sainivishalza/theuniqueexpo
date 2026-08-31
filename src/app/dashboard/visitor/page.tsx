"use client";

import { useAuth } from "@/lib/auth-context";

const features = [
  { title: "Browse Exhibitions", description: "Upcoming events near you", icon: "🎯", color: "from-teal-500 to-cyan-600" },
  { title: "Visit Planner", description: "Build your show-day itinerary", icon: "📅", color: "from-purple-500 to-purple-600" },
  { title: "Saved Exhibitors", description: "Your bookmarked profiles", icon: "⭐", color: "from-yellow-400 to-amber-500" },
  { title: "My Registrations", description: "Events you're attending", icon: "🎫", color: "from-emerald-500 to-green-600" },
  { title: "Messages", description: "Conversations with exhibitors", icon: "💬", color: "from-pink-500 to-rose-500" },
  { title: "Content", description: "Magazine articles and videos", icon: "📰", color: "from-orange-500 to-red-500" },
];

export default function VisitorDashboard() {
  const { user } = useAuth();

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">🎫</div>
            <div className="text-white">
              <h1 className="text-3xl font-extrabold">Visitor Dashboard</h1>
              <p className="mt-1 text-emerald-200/80">Welcome back{user?.name ? `, ${user.name}` : ""}. Explore, attend, connect.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-4 p-6 rounded-2xl bg-white border border-gray-100 shadow-sm card-hover">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-xl flex-shrink-0`}>
                  {f.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{f.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{f.description}</p>
                  <span className="mt-2 inline-block rounded-lg bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-400">Coming soon</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
