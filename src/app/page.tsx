import Link from "next/link";
import { exhibitions } from "@/lib/exhibitions";
import { exhibitionHeroImages, industryImages } from "@/lib/images";

const stats = [
  { value: "6+", label: "Major Exhibitions", icon: "🎯" },
  { value: "5,000+", label: "Exhibitors", icon: "🏢" },
  { value: "300K+", label: "Global Visitors", icon: "🌍" },
  { value: "50+", label: "Countries", icon: "🤝" },
];

const industries = [
  { name: "Food & Beverage", icon: "🍽️", count: 120, color: "from-orange-500 to-red-500" },
  { name: "Automotive", icon: "🚗", count: 85, color: "from-blue-500 to-indigo-600" },
  { name: "Industrial", icon: "⚙️", count: 64, color: "from-purple-500 to-violet-600" },
  { name: "Digital Trade", icon: "💻", count: 150, color: "from-cyan-500 to-blue-500" },
  { name: "Manufacturing", icon: "🏭", count: 95, color: "from-amber-500 to-orange-500" },
  { name: "Trade & Investment", icon: "🤝", count: 110, color: "from-emerald-500 to-green-600" },
];

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Import Director, Global Foods Inc.",
    text: "ExpoBridge transformed how we discover suppliers. We closed 3 deals at the Food Expo that are now worth $2M+ annually.",
    avatar: "👩‍💼",
  },
  {
    name: "Ahmed Al-Rashid",
    role: "CEO, AutoParts Middle East",
    text: "The booth booking was seamless and the buyer matching got us 40 qualified leads in just 2 days at the Auto Parts Fair.",
    avatar: "👨‍💼",
  },
  {
    name: "Lisa Zhang",
    role: "VP Procurement, TechFlow Solutions",
    text: "Best digital trade expo experience. The platform made it easy to schedule meetings before the event even started.",
    avatar: "👩‍🔬",
  },
];

export default function Home() {
  const featured = exhibitions.slice(0, 3);

  return (
    <main>
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden gradient-hero min-h-[90vh] flex items-center">
        {/* Background image overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&h=900&fit=crop&q=80")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 text-white w-full">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm mb-6 animate-fade-in">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              6 Upcoming Exhibitions in 2026
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight animate-slide-up">
              Where Global
              <br />
              <span className="bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
                Trade Happens
              </span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-blue-100/80 max-w-xl leading-relaxed" style={{ animationDelay: "0.2s" }}>
              Discover exhibitions, connect with buyers & exhibitors, and grow your business
              on the world&apos;s leading B2B trade platform.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/exhibitions"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-blue-700 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105 transition-all duration-300"
              >
                Browse Exhibitions
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/10 transition-all duration-300"
              >
                List Your Exhibition
              </Link>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-white/10 backdrop-blur-sm px-6 py-5 border border-white/10">
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-blue-200/70 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Exhibitions ── */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <span className="inline-block rounded-full bg-blue-100 px-4 py-1.5 text-sm font-semibold text-blue-700 mb-4">
              Featured Events
            </span>
            <h2 className="text-4xl font-extrabold text-gray-900">
              Upcoming Exhibitions
            </h2>
            <p className="mt-3 text-lg text-gray-500 max-w-2xl mx-auto">
              Don&apos;t miss these world-class trade events. Book your booth or register as a visitor today.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {featured.map((expo) => (
              <Link
                key={expo.id}
                href={`/exhibitions/${expo.slug}`}
                className="group block rounded-2xl overflow-hidden bg-white shadow-lg shadow-gray-200/60 card-hover"
              >
                {/* Image */}
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={exhibitionHeroImages[expo.slug] || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&q=80"}
                    alt={expo.title}
                    className="img-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 gradient-overlay-light" />
                  <div className="absolute top-4 left-4">
                    <span className="rounded-lg bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-gray-900 shadow-sm">
                      {expo.industry}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="text-sm font-medium text-white/90">{expo.dates}</div>
                  </div>
                </div>
                {/* Content */}
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {expo.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {expo.venue}, {expo.city}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex gap-4 text-xs text-gray-400">
                      <span>🏢 {expo.exhibitors.toLocaleString()} exhibitors</span>
                      <span>👥 {expo.visitors}</span>
                    </div>
                    <span className="text-blue-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                      View →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/exhibitions"
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-3.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
            >
              View All Exhibitions
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
              How ExpoBridge Works
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Discover Exhibitions",
                desc: "Browse hundreds of global trade fairs by industry, date, and location. Find the perfect event for your business.",
                icon: "🔍",
                color: "from-blue-500 to-blue-600",
              },
              {
                step: "02",
                title: "Book & Connect",
                desc: "Reserve your booth, schedule meetings with buyers, and set up your exhibitor profile — all before the event starts.",
                icon: "📅",
                color: "from-purple-500 to-purple-600",
              },
              {
                step: "03",
                title: "Close Deals",
                desc: "Meet face-to-face, share product catalogs, negotiate on-site, and finalize orders with verified global partners.",
                icon: "🤝",
                color: "from-emerald-500 to-emerald-600",
              },
            ].map((item) => (
              <div key={item.step} className="relative rounded-2xl bg-white p-8 border border-gray-100 shadow-sm card-hover">
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} text-white text-xl mb-5`}>
                  {item.icon}
                </div>
                <div className="text-xs font-bold text-gray-300 mb-2">STEP {item.step}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-blue-300 mb-4">
              Trusted by Professionals
            </span>
            <h2 className="text-4xl font-extrabold">
              What Our Users Say
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl bg-white/5 border border-white/10 p-8 backdrop-blur-sm">
                <div className="flex mb-4 text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-6">&quot;{t.text}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg">{t.avatar}</div>
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="py-20 gradient-brand">
        <div className="mx-auto max-w-4xl px-6 text-center text-white">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
            Ready to Grow Your Business?
          </h2>
          <p className="text-lg text-blue-100/80 max-w-2xl mx-auto mb-10">
            Join thousands of exhibitors and buyers who use ExpoBridge to discover
            opportunities, book booths, and close deals at world-class trade events.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-blue-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              Get Started Free
            </Link>
            <Link
              href="/exhibitions"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-all duration-300"
            >
              Explore Exhibitions
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
