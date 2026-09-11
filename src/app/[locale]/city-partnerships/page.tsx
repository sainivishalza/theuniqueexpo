"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { errorMessage } from "@/lib/format";
import { DEFAULT_CITY_PARTNERSHIPS_CONTENT, type CityPartnershipsContent } from "@/lib/city-partnerships-content";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function CityPartnershipsPage() {
  const t = useTranslations("cityPartnershipsPage");
  const [content, setContent] = useState<CityPartnershipsContent>(DEFAULT_CITY_PARTNERSHIPS_CONTENT);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", organization: "", city: "", country: "", message: "" });

  useEffect(() => {
    fetch("/api/city-partnerships-content")
      .then((res) => res.json())
      .then((data) => data.content && setContent(data.content))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/city-partnership-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
      <Card shadow="sm" bordered={false} className="text-center max-w-md mx-auto p-8">
        <div className="text-6xl mb-4">🏙️</div>
        <h1 className="text-2xl font-bold text-heading mb-2">{t("inquirySent")}</h1>
        <p className="text-gray-500 mb-6">{t("inquirySentHint")}</p>
        <Button onClick={() => setSubmitted(false)} variant="gradientPlain" size="wide">{t("sendAnother")}</Button>
      </Card>
    </div>
  );

  return (
    <div>
      <section className="relative overflow-hidden bg-[var(--color-hero-bg)] py-20">
        <div className="absolute inset-0 opacity-15">
          <Image src={content.heroImage} alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <p className="text-emerald-300 font-semibold mb-2">{t("eyebrow")}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold">{content.title}</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-2xl">{content.subtitle}</p>
        </div>
      </section>
      <section className="py-16 bg-cream-50">
        <div className="mx-auto max-w-7xl px-6 grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-heading mb-6">{t("whyPartner")}</h2>
            <div className="space-y-4">
              {content.benefits.map((item) => (
                <div key={item.title} className="flex items-start gap-4 p-4 rounded-xl bg-white shadow-sm">
                  <span className="text-2xl">{item.icon}</span>
                  <div><h3 className="font-bold text-heading">{item.title}</h3><p className="text-sm text-gray-500">{item.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Card shadow="sm" bordered={false} className="p-8 sticky top-24">
              <h2 className="text-2xl font-bold text-heading mb-6">{t("startAConversation")}</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("name")}</label><input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("email")}</label><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("organization")}</label><input required type="text" placeholder={t("organizationPlaceholder")} value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("city")}</label><input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("country")}</label><input type="text" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("message")}</label><textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} placeholder={t("messagePlaceholder")} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none resize-none" /></div>
                {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                <Button type="submit" disabled={submitting} variant="save" size="block">{submitting ? t("sending") : t("sendInquiry")}</Button>
              </form>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
