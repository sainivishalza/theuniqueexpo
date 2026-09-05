"use client";
import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { errorMessage } from "@/lib/format";

const HANDLE_KEYS = [
  { key: "internationalFreight", icon: "🚢" },
  { key: "customsClearance", icon: "📋" },
  { key: "officeRelocation", icon: "🏢" },
  { key: "residentialMoving", icon: "🏠" },
  { key: "storageSolutions", icon: "📦" },
  { key: "insuranceCoverage", icon: "🛡️" },
  { key: "settlingIn", icon: "🏦" },
  { key: "petRelocation", icon: "🐾" },
];

export default function MovingAssistancePage() {
  const t = useTranslations("movingAssistancePage");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", type: "office", origin: "", destination: "", date: "", details: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/moving-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, email: form.email, phone: form.phone, company: form.company,
          movingType: form.type, originCity: form.origin, destinationCity: form.destination,
          preferredDate: form.date, details: form.details,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || t("requestFailed"));
      setSubmitted(true);
    } catch (err) {
      setError(errorMessage(err, t("requestFailed")));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-sm">
        <div className="text-6xl mb-4">📦</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("quoteRequested")}</h1>
        <p className="text-gray-500 mb-6">{t("quoteRequestedHint")}</p>
        <button onClick={() => setSubmitted(false)} className="rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white">{t("submitAnother")}</button>
      </div>
    </div>
  );

  return (
    <div>
      <section className="relative overflow-hidden bg-gray-900 py-20">
        <div className="absolute inset-0 opacity-15">
          <Image src="https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=1600&h=600&fit=crop&q=80" alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <p className="text-emerald-300 font-semibold mb-2">{t("ourServices")}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold">{t("title")}</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-2xl">{t("subtitle")}</p>
        </div>
      </section>
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("whatWeHandle")}</h2>
            <div className="space-y-4">
              {HANDLE_KEYS.map((s) => (
                <div key={s.key} className="flex items-start gap-4 p-4 rounded-xl bg-white shadow-sm">
                  <span className="text-2xl">{s.icon}</span>
                  <div><h3 className="font-bold text-gray-900">{t(`handle.${s.key}.title`)}</h3><p className="text-sm text-gray-500">{t(`handle.${s.key}.desc`)}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="bg-white rounded-2xl p-8 shadow-sm sticky top-24">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("requestMovingQuote")}</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("name")}</label><input required type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("email")}</label><input required type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("phone")}</label><input type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("company")}</label><input type="text" value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("movingType")}</label>
                  <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none">
                    <option value="office">{t("movingTypes.office")}</option><option value="residential">{t("movingTypes.residential")}</option><option value="freight">{t("movingTypes.freight")}</option><option value="pet">{t("movingTypes.pet")}</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("originCity")}</label><input required type="text" value={form.origin} onChange={(e) => setForm({...form, origin: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" placeholder={t("originCityPlaceholder")} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("destinationCity")}</label><input required type="text" value={form.destination} onChange={(e) => setForm({...form, destination: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" placeholder={t("destinationCityPlaceholder")} /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("preferredMoveDate")}</label><input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("additionalDetails")}</label><textarea value={form.details} onChange={(e) => setForm({...form, details: e.target.value})} rows={3} placeholder={t("additionalDetailsPlaceholder")} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none resize-none" /></div>
                {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                <button type="submit" disabled={submitting} className="w-full rounded-xl gradient-brand py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50">{submitting ? t("submitting") : t("submitQuoteRequest")}</button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
