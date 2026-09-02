"use client";
import { useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";

const TOPICS = ["Market Entry Strategy", "Supplier Sourcing", "Product Quality Inspection", "Legal & Compliance", "Cultural Etiquette", "Trade Compliance", "Intellectual Property", "General Consultation"];

export default function ConsultationPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", topic: "", date: "", questions: "" });
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setSubmitted(true); };

  if (submitted) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-sm">
        <div className="text-6xl mb-4">💬</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Consultation Booked!</h1>
        <p className="text-gray-500 mb-6">Our expert will confirm your consultation slot within 24 hours. You&apos;ll receive a calendar invite via email.</p>
        <button onClick={() => setSubmitted(false)} className="rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white">Book Another</button>
      </div>
    </div>
  );

  return (
    <div>
      <section className="relative overflow-hidden bg-gray-900 py-20">
        <div className="absolute inset-0 opacity-15">
          <Image src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1600&h=600&fit=crop&q=80" alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <p className="text-emerald-300 font-semibold mb-2">Our Services</p>
          <h1 className="text-4xl md:text-5xl font-extrabold">Consultation on China</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-2xl">One-on-one expert sessions on doing business in China — market entry, sourcing, legal, and trade compliance.</p>
        </div>
      </section>
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Consultation Topics</h2>
            <div className="space-y-4">
              {[{icon:"🎯",title:"Market Entry Strategy",desc:"Competitor analysis, pricing, distribution channels, regulatory landscape"},{icon:"🔍",title:"Supplier Sourcing",desc:"Factory verification, background checks, sample coordination, price negotiation"},{icon:"✅",title:"Quality Inspection",desc:"Pre-shipment inspection, factory audits, product testing coordination"},{icon:"⚖️",title:"Legal & Compliance",desc:"Contract review, IP protection, regulatory compliance, dispute resolution"},{icon:"🤝",title:"Cultural Etiquette",desc:"Negotiation tactics, business card protocol, gift-giving, dining customs"},{icon:"📦",title:"Trade Compliance",desc:"Customs classification, import/export regulations, tariff optimization"},{icon:"🛡️",title:"IP Protection",desc:"Trademark registration, patent filing, trade secret protection in China"}].map((t) => (
                <div key={t.title} className="flex items-start gap-4 p-4 rounded-xl bg-white shadow-sm">
                  <span className="text-2xl">{t.icon}</span>
                  <div><h3 className="font-bold text-gray-900">{t.title}</h3><p className="text-sm text-gray-500">{t.desc}</p></div>
                </div>
              ))}
            </div>
            <div className="mt-8 p-6 bg-white rounded-2xl shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">Pricing</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-600">Single Session (60 min)</span><span className="font-bold text-gray-900">$150 USD</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Package of 4 Sessions</span><span className="font-bold text-gray-900">$500 USD</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Monthly Retainer</span><span className="font-bold text-gray-900">$1,200 USD</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Free Discovery Call</span><span className="font-bold text-green-600">FREE</span></div>
              </div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-2xl p-8 shadow-sm sticky top-24">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Book a Consultation</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label><input required type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input required type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Company</label><input type="text" value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Topic *</label>
                  <select required value={form.topic} onChange={(e) => setForm({...form, topic: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none">
                    <option value="">Select a topic...</option>{TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label><input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Questions / Topics to Cover</label><textarea value={form.questions} onChange={(e) => setForm({...form, questions: e.target.value})} rows={4} placeholder="Tell us about your business needs and what you'd like to discuss..." className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none resize-none" /></div>
                <button type="submit" className="w-full rounded-xl gradient-brand py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity">Book Consultation</button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
