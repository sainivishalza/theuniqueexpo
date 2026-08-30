"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { businessTours, submitTourApplication } from "@/lib/tours";

const TOUR_SERVICES = [
  "Purchase of tickets (flights)",
  "Hotel accommodation",
  "Exhibition registration & passes",
  "Visa documentation support",
  "Professional escort & guide",
  "Mandarin/English interpreter",
  "Factory & warehouse visits",
  "Airport transfers & logistics",
];

export default function ApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string>("");
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "", nationality: "", travelers: 1,
    services: [] as string[], specialRequests: "",
  });

  // Resolve params on mount
  import("next/navigation").then(({ useParams }) => {
    const p = useParams();
    if (p.slug && !slug) setSlug(p.slug as string);
  });

  const tour = businessTours.find((t) => t.slug === slug);

  const toggleService = (s: string) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(s) ? prev.services.filter((x) => x !== s) : [...prev.services, s],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tour || !user) return;
    submitTourApplication({
      tourId: tour.id, userId: user.id, name: form.name, email: form.email,
      phone: form.phone, company: form.company, nationality: form.nationality,
      travelers: form.travelers, services: form.services, specialRequests: form.specialRequests,
    });
    setSubmitted(true);
  };

  if (!tour) return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;
  if (submitted) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-sm">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h1>
        <p className="text-gray-500 mb-6">Your tour application for <strong>{tour.title}</strong> has been received. Our team will review it and contact you within 24-48 hours.</p>
        <Link href="/services/business-tours" className="inline-block rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white">← Back to Tours</Link>
      </div>
    </div>
  );

  return (
    <div className="py-12 bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-3xl px-6">
        <Link href={"/services/business-tours/" + tour.slug} className="text-sm text-blue-600 hover:text-blue-700 mb-6 inline-block">← Back to {tour.title}</Link>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Apply for {tour.title}</h1>
        <p className="text-gray-500 mb-8">{tour.dates} • {tour.duration} • ${tour.price} USD/person</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl p-8 shadow-sm space-y-5">
            <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label><input required type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input required type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label><input required type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Company</label><input type="text" value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nationality *</label><input required type="text" value={form.nationality} onChange={(e) => setForm({...form, nationality: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Number of Travelers *</label><input required type="number" min="1" max="30" value={form.travelers} onChange={(e) => setForm({...form, travelers: Number(e.target.value)})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 outline-none" /></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Select Services</h2>
            <p className="text-sm text-gray-500 mb-4">Choose the services you need included in your tour package:</p>
            <div className="grid gap-3 md:grid-cols-2">
              {TOUR_SERVICES.map((s) => (
                <label key={s} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${form.services.includes(s) ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <input type="checkbox" checked={form.services.includes(s)} onChange={() => toggleService(s)} className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Special Requests</h2>
            <textarea value={form.specialRequests} onChange={(e) => setForm({...form, specialRequests: e.target.value})} rows={4} placeholder="Any dietary requirements, accessibility needs, or special requests..." className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 outline-none resize-none" />
          </div>

          <button type="submit" className="w-full rounded-xl gradient-brand py-4 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
            Submit Application
          </button>
        </form>
      </div>
    </div>
  );
}
