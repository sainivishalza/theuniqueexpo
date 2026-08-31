"use client";
import { useState } from "react";

export default function MovingAssistancePage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", type: "office", origin: "", destination: "", date: "", details: "" });

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setSubmitted(true); };

  if (submitted) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-sm">
        <div className="text-6xl mb-4">📦</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Quote Requested!</h1>
        <p className="text-gray-500 mb-6">Our moving team will prepare a custom quote and contact you within 24 hours.</p>
        <button onClick={() => setSubmitted(false)} className="rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white">Submit Another</button>
      </div>
    </div>
  );

  return (
    <div>
      <section className="relative overflow-hidden bg-gray-900 py-20">
        <div className="absolute inset-0 opacity-15"><img src="https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=1600&h=600&fit=crop&q=80" alt="" className="img-cover" /></div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <p className="text-emerald-300 font-semibold mb-2">Our Services</p>
          <h1 className="text-4xl md:text-5xl font-extrabold">Moving Assistance</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-2xl">Comprehensive relocation support for businesses and individuals moving to or from China.</p>
        </div>
      </section>
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">What We Handle</h2>
            <div className="space-y-4">
              {[{icon:"🚢",title:"International Freight",desc:"Sea, air, and land shipping with full tracking"},{icon:"📋",title:"Customs Clearance",desc:"Import/export documentation and compliance"},{icon:"🏢",title:"Office Relocation",desc:"Complete office move project management"},{icon:"🏠",title:"Residential Moving",desc:"Home relocation with unpacking and setup"},{icon:"📦",title:"Storage Solutions",desc:"Short and long-term warehouse storage"},{icon:"🛡️",title:"Insurance Coverage",desc:"Comprehensive cargo and liability insurance"},{icon:"🏦",title:"Settling-In Services",desc:"Bank account, SIM card, housing search"},{icon:"🐾",title:"Pet Relocation",desc:"Safe international pet transport assistance"}].map((s) => (
                <div key={s.title} className="flex items-start gap-4 p-4 rounded-xl bg-white shadow-sm">
                  <span className="text-2xl">{s.icon}</span>
                  <div><h3 className="font-bold text-gray-900">{s.title}</h3><p className="text-sm text-gray-500">{s.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="bg-white rounded-2xl p-8 shadow-sm sticky top-24">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Request Moving Quote</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label><input required type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input required type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Company</label><input type="text" value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Moving Type *</label>
                  <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none">
                    <option value="office">Office Relocation</option><option value="residential">Residential Moving</option><option value="freight">Freight Only</option><option value="pet">Pet Relocation</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Origin City *</label><input required type="text" value={form.origin} onChange={(e) => setForm({...form, origin: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" placeholder="e.g. Dubai, UAE" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Destination City *</label><input required type="text" value={form.destination} onChange={(e) => setForm({...form, destination: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" placeholder="e.g. Shenzhen, China" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Preferred Move Date</label><input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Additional Details</label><textarea value={form.details} onChange={(e) => setForm({...form, details: e.target.value})} rows={3} placeholder="Volume estimate, special items, timeline constraints..." className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none resize-none" /></div>
                <button type="submit" className="w-full rounded-xl gradient-brand py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity">Submit Quote Request</button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
