"use client";
import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { errorMessage } from "@/lib/format";

const TOPIC_KEYS = ["housing", "schools", "visas", "adaptation", "other"];

export default function RelocationPage() {
  const t = useTranslations("relocationPage");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", topic: "housing", date: "", questions: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/consultation-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, email: form.email, company: "",
          topic: t(`topicOptions.${form.topic}`), preferredDate: form.date, questions: form.questions,
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
        <div className="text-6xl mb-4">🏡</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("requestReceived")}</h1>
        <p className="text-gray-500 mb-6">{t("requestReceivedHint")}</p>
        <button onClick={() => setSubmitted(false)} className="rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white">{t("submitAnother")}</button>
      </div>
    </div>
  );

  return (
    <div>
      <section className="relative overflow-hidden bg-gray-900 py-20">
        <div className="absolute inset-0 opacity-15">
          <Image src="https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1600&h=600&fit=crop&q=80" alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <h1 className="text-4xl md:text-5xl font-extrabold">{t("title")}</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-2xl">{t("subtitle")}</p>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("whatWeHelpWith")}</h2>
            <div className="space-y-4">
              {[
                { key: "housing", icon: "🏠" },
                { key: "schools", icon: "🎒" },
                { key: "visas", icon: "🛂" },
                { key: "adaptation", icon: "🧭" },
              ].map((s) => (
                <div key={s.key} className="flex items-start gap-4 p-4 rounded-xl bg-white shadow-sm">
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <h3 className="font-bold text-gray-900">{t(`topics.${s.key}.title`)}</h3>
                    <p className="text-sm text-gray-500">{t(`topics.${s.key}.desc`)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 p-6 bg-white rounded-2xl shadow-sm">
              <p className="text-sm text-gray-500">
                {t.rich("moreDetail", {
                  visaLink: (chunks) => <Link href="/services/visa-setup" className="text-emerald-600 hover:underline font-semibold">{chunks}</Link>,
                  movingLink: (chunks) => <Link href="/services/moving-assistance" className="text-emerald-600 hover:underline font-semibold">{chunks}</Link>,
                })}
              </p>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-2xl p-8 shadow-sm sticky top-24">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("requestConsultation")}</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("name")}</label>
                    <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("email")}</label>
                    <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("topic")}</label>
                  <select value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none">
                    {TOPIC_KEYS.map((key) => <option key={key} value={key}>{t(`topicOptions.${key}`)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("preferredDate")}</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("tellUsMore")}</label>
                  <textarea value={form.questions} onChange={(e) => setForm({ ...form, questions: e.target.value })} rows={4} placeholder={t("tellUsMorePlaceholder")} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none resize-none" />
                </div>
                {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                <button type="submit" disabled={submitting} className="w-full rounded-xl gradient-brand py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50">
                  {submitting ? t("submitting") : t("submitRequest")}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
