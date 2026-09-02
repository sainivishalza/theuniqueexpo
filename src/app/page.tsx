import Image from "next/image";
import Link from "next/link";
import { formatNumber } from "@/lib/format";
import { listExhibitions } from "@/lib/server/exhibitions-repo";

// How many of the soonest upcoming exhibitions to feature on the homepage.
const FEATURED_COUNT = 6;

// Content only changes via the admin panel -- cache the rendered page and
// revalidate in the background instead of hitting the DB on every request.
export const revalidate = 60;

const stats = [
  { value: "20+", label: "Major Exhibitions", icon: "🎯" },
  { value: "15,000+", label: "Exhibitors", icon: "🏢" },
  { value: "500K+", label: "Global Visitors", icon: "🌍" },
  { value: "15+", label: "Chinese Markets", icon: "🤝" },
];

const industries = [
  { name: "Electronics", icon: "🔌", count: 200, color: "from-slate-500 to-gray-700" },
  { name: "Digital Trade", icon: "💻", count: 120, color: "from-fuchsia-500 to-pink-600" },
  { name: "Lighting", icon: "💡", count: 75, color: "from-yellow-400 to-amber-500" },
  { name: "Furniture", icon: "🪑", count: 90, color: "from-amber-600 to-orange-600" },
  { name: "Manufacturing", icon: "🏭", count: 110, color: "from-amber-500 to-orange-500" },
  { name: "Energy", icon: "⚡", count: 80, color: "from-green-500 to-emerald-600" },
  { name: "Trade & Investment", icon: "🤝", count: 150, color: "from-emerald-500 to-green-600" },
  { name: "Health & Beauty", icon: "💄", count: 65, color: "from-pink-400 to-rose-500" },
  { name: "Logistics", icon: "📦", count: 60, color: "from-teal-500 to-cyan-600" },
  { name: "Hospitality", icon: "🏨", count: 70, color: "from-orange-600 to-red-700" },
  { name: "Toys & Gifts", icon: "🧸", count: 65, color: "from-pink-400 to-rose-500" },
  { name: "Agriculture", icon: "🚜", count: 55, color: "from-green-500 to-lime-600" },
];

export default async function Home() {
  const exhibitions = await listExhibitions();
  const featured = exhibitions.slice(0, FEATURED_COUNT);

  return (
    <main>
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden bg-gray-900 min-h-[85vh] flex items-center">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&h=900&fit=crop&q=80"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 text-white w-full">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              {exhibitions.length} Upcoming Exhibitions in 2026
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight">
              Where Global
              <br />
              <span className="bg-gradient-to-r from-emerald-300 to-purple-300 bg-clip-text text-transparent">
                Trade Happens
              </span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-emerald-100/80 max-w-xl leading-relaxed">
              Discover exhibitions, connect with buyers & exhibitors, and grow your business
              on the world&apos;s leading B2B trade platform.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/exhibitions" className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-emerald-700 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:scale-105 transition-all duration-300">
                Browse Exhibitions
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
              <Link href="/services" className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                Our Services
              </Link>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-white/10 backdrop-blur-sm px-6 py-5 border border-white/10">
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-emerald-200/70 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Events Banner — Full Detail Cards ── */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <span className="inline-block rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-700 mb-4">
              🎪 Featured Events
            </span>
            <h2 className="text-4xl font-extrabold text-gray-900">
              Upcoming Exhibitions
            </h2>
            <p className="mt-3 text-lg text-gray-500 max-w-2xl mx-auto">
              Don&apos;t miss these world-class trade events. Register as a hosted buyer and enjoy exclusive benefits.
            </p>
          </div>

          {/* Event Cards — Poster-Style Layout. Pulls straight from the same
              admin-editable exhibitions as /exhibitions and the detail
              pages, so editing one in the admin panel updates everywhere
              at once instead of drifting out of sync. */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((evt) => (
              <Link
                key={evt.id}
                href={`/exhibitions/${evt.slug}`}
                className="group block rounded-2xl overflow-hidden bg-white shadow-lg shadow-gray-200/60 card-hover border border-gray-100"
              >
                {/* Header */}
                <div className="relative p-6 text-white" style={{ backgroundColor: evt.color }}>
                  <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1 text-xs font-bold">
                    {evt.dates.split(",")[0]}
                  </div>
                  <h3 className="text-xl font-extrabold leading-tight pr-20">{evt.title}</h3>
                  <div className="mt-3 flex items-center gap-2 text-xs text-white/70">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {evt.venue}, {evt.city}
                  </div>
                </div>

                {/* Image */}
                {evt.image && (
                  <div className="relative h-44 overflow-hidden">
                    <Image
                      src={evt.image}
                      alt={evt.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  </div>
                )}

                {/* Highlights */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-bold text-gray-900">★</span>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Highlights</span>
                  </div>
                  <ul className="space-y-1.5 mb-4">
                    {evt.highlights.slice(0, 3).map((h) => (
                      <li key={h} className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5 shrink-0">✦</span>
                        {h}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">{formatNumber(evt.exhibitors)}+ exhibitors</span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white group-hover:bg-emerald-600 transition-colors">
                      View Details →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href="/exhibitions" className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-3.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors">
              View All {exhibitions.length} Exhibitions
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Industry Categories ── */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <span className="inline-block rounded-full bg-purple-100 px-4 py-1.5 text-sm font-semibold text-purple-700 mb-4">
              Browse by Industry
            </span>
            <h2 className="text-4xl font-extrabold text-gray-900">
              Find Your Sector
            </h2>
            <p className="mt-3 text-lg text-gray-500">
              Explore exhibitions across the industries that matter most.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {industries.map((ind) => (
              <Link
                key={ind.name}
                href={`/exhibitions?industry=${encodeURIComponent(ind.name)}`}
                className="group relative rounded-2xl p-6 text-center card-hover overflow-hidden border border-gray-100"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${ind.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                <div className="relative text-4xl mb-3">{ind.icon}</div>
                <div className="relative text-sm font-bold text-gray-900">{ind.name}</div>
                <div className="relative text-xs text-gray-400 mt-1">{ind.count}+ events</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <span className="inline-block rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-700 mb-4">
              Simple Process
            </span>
            <h2 className="text-4xl font-extrabold text-gray-900">
              How The Unique Expo Works
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: "01", title: "Discover Exhibitions", desc: "Browse global trade fairs by industry, date, and location. Find the perfect event for your business.", icon: "🔍", color: "from-emerald-500 to-emerald-600" },
              { step: "02", title: "Register as Buyer", desc: "Apply for hosted buyer programmes, get travel subsidies, hotel accommodation, and VIP access.", icon: "📋", color: "from-purple-500 to-purple-600" },
              { step: "03", title: "Connect & Close Deals", desc: "Meet exhibitors face-to-face, schedule 1-on-1 meetings, negotiate, and close deals on-site.", icon: "🤝", color: "from-amber-500 to-orange-600" },
            ].map((item) => (
              <div key={item.step} className="relative rounded-2xl bg-white p-8 border border-gray-100 shadow-sm card-hover">
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} text-white text-xl mb-5`}>{item.icon}</div>
                <div className="text-xs font-bold text-gray-300 mb-2">STEP {item.step}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-700">
        <div className="mx-auto max-w-4xl px-6 text-center text-white">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
            Ready to Grow Your Business?
          </h2>
          <p className="text-lg text-emerald-100/80 max-w-2xl mx-auto mb-10">
            Join thousands of exhibitors and buyers who use The Unique Expo to discover
            opportunities, register as hosted buyers, and close deals at world-class trade events in China.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-emerald-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
              Get Started Free
            </Link>
            <Link href="/services" className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-all duration-300">
              Explore Our Services
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
