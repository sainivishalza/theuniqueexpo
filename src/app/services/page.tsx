"use client";

import Link from "next/link";
import { serviceCategories } from "@/lib/services";

export default function ServicesPage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gray-900 py-20">
        <div className="absolute inset-0 opacity-15">
          <img src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1600&h=600&fit=crop&q=80" alt="" className="img-cover" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <h1 className="text-4xl md:text-5xl font-extrabold">Our Services</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-2xl">Everything you need to exhibit at, attend, or do business in China — from tours and visas to moving and consultation.</p>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {serviceCategories.map((svc) => (
              <Link key={svc.id} href={svc.slug === "business-tours" || svc.slug === "china-tours" ? "/services/" + svc.slug : svc.slug === "transport-subsidies" ? "/services/transport-subsidies" : "/services/" + svc.slug} className="group block rounded-2xl overflow-hidden bg-white shadow-md shadow-gray-200/50 card-hover">
                <div className="relative h-48 overflow-hidden">
                  <img src={svc.image} alt={svc.title} className="img-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 gradient-overlay" />
                  <div className="absolute top-4 left-4">
                    <span className="rounded-lg bg-white/90 backdrop-blur-sm px-3 py-1 text-xl shadow-sm">{svc.icon}</span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-bold text-white drop-shadow-lg">{svc.title}</h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-500 mb-4 line-clamp-3">{svc.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {svc.features.slice(0, 4).map((f) => (
                      <span key={f} className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs text-gray-600">{f}</span>
                    ))}
                    {svc.features.length > 4 && <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs text-gray-400">+{svc.features.length - 4} more</span>}
                  </div>
                  <span className="inline-block rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white group-hover:scale-105 transition-transform">{svc.ctaText} →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Why Choose ExpoBridge Services?</h2>
          <p className="text-gray-500 max-w-2xl mx-auto mb-12">We handle the logistics so you can focus on growing your business.</p>
          <div className="grid gap-8 md:grid-cols-4">
            {[{icon:"🎯",title:"End-to-End",desc:"From visa to factory visit, we handle everything"},{icon:"🌍",title:"15+ Years",desc:"Deep expertise in China trade and exhibitions"},{icon:"🤝",title:"Trusted Network",desc:"500+ verified partners across China"},{icon:"💬",title:"24/7 Support",desc:"Multilingual support throughout your journey"}].map((b) => (
              <div key={b.title} className="text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center text-3xl mb-4">{b.icon}</div>
                <h3 className="font-bold text-gray-900 mb-1">{b.title}</h3>
                <p className="text-sm text-gray-500">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
