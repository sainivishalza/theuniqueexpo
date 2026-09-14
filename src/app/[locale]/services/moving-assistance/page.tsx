"use client";
import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { errorMessage } from "@/lib/format";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField, { fieldClasses } from "@/components/ui/FormField";

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function MovingAssistancePage() {
  const t = useTranslations("movingAssistancePage");
  const tv = useTranslations("formValidation");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", type: "office", origin: "", destination: "", date: "", details: "" });

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = tv("required");
    if (!form.email.trim()) errors.email = tv("required");
    else if (!EMAIL_RE.test(form.email)) errors.email = tv("invalidEmail");
    if (!form.origin.trim()) errors.origin = tv("required");
    if (!form.destination.trim()) errors.destination = tv("required");
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
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
      <Card shadow="sm" bordered={false} className="text-center max-w-md mx-auto p-8">
        <div className="text-6xl mb-4">📦</div>
        <h1 className="text-2xl font-bold text-heading mb-2">{t("quoteRequested")}</h1>
        <p className="text-gray-500 mb-6">{t("quoteRequestedHint")}</p>
        <Button onClick={() => setSubmitted(false)} variant="gradientPlain" size="wide">{t("submitAnother")}</Button>
      </Card>
    </div>
  );

  return (
    <div>
      <section className="relative overflow-hidden bg-[var(--color-hero-bg)] py-20">
        <div className="absolute inset-0 opacity-15">
          <Image src="https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=1600&h=600&fit=crop&q=80" alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <p className="text-emerald-300 font-semibold mb-2">{t("ourServices")}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold">{t("title")}</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-2xl">{t("subtitle")}</p>
        </div>
      </section>
      <section className="py-16 bg-cream-50">
        <div className="mx-auto max-w-7xl px-6 grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-heading mb-6">{t("whatWeHandle")}</h2>
            <div className="space-y-4">
              {HANDLE_KEYS.map((s) => (
                <div key={s.key} className="flex items-start gap-4 p-4 rounded-xl bg-white shadow-sm">
                  <span className="text-2xl">{s.icon}</span>
                  <div><h3 className="font-bold text-heading">{t(`handle.${s.key}.title`)}</h3><p className="text-sm text-gray-500">{t(`handle.${s.key}.desc`)}</p></div>
                </div>
              ))}
            </div>
            <Link href="/services/relocation-cost-estimator" className="mt-6 flex items-center gap-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100 hover:border-emerald-300 transition-colors">
              <span className="text-2xl">🧮</span>
              <div><h3 className="font-bold text-heading">{t("costEstimatorTeaser.title")}</h3><p className="text-sm text-gray-500">{t("costEstimatorTeaser.desc")}</p></div>
            </Link>
          </div>
          <div>
            <Card shadow="sm" bordered={false} className="p-8 sticky top-24">
              <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-heading mb-6">{t("requestMovingQuote")}</h2>
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label={t("name")} htmlFor="name" error={fieldErrors.name}>
                    <input id="name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!fieldErrors.name} className={fieldClasses(!!fieldErrors.name)} />
                  </FormField>
                  <FormField label={t("email")} htmlFor="email" error={fieldErrors.email}>
                    <input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!fieldErrors.email} className={fieldClasses(!!fieldErrors.email)} />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label={t("phone")} htmlFor="phone">
                    <input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={fieldClasses()} />
                  </FormField>
                  <FormField label={t("company")} htmlFor="company">
                    <input id="company" type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={fieldClasses()} />
                  </FormField>
                </div>
                <FormField label={t("movingType")} htmlFor="movingType">
                  <select id="movingType" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={fieldClasses()}>
                    <option value="office">{t("movingTypes.office")}</option><option value="residential">{t("movingTypes.residential")}</option><option value="freight">{t("movingTypes.freight")}</option><option value="pet">{t("movingTypes.pet")}</option>
                  </select>
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label={t("originCity")} htmlFor="origin" error={fieldErrors.origin}>
                    <input id="origin" type="text" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} aria-invalid={!!fieldErrors.origin} className={fieldClasses(!!fieldErrors.origin)} placeholder={t("originCityPlaceholder")} />
                  </FormField>
                  <FormField label={t("destinationCity")} htmlFor="destination" error={fieldErrors.destination}>
                    <input id="destination" type="text" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} aria-invalid={!!fieldErrors.destination} className={fieldClasses(!!fieldErrors.destination)} placeholder={t("destinationCityPlaceholder")} />
                  </FormField>
                </div>
                <FormField label={t("preferredMoveDate")} htmlFor="date">
                  <input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={fieldClasses()} />
                </FormField>
                <FormField label={t("additionalDetails")} htmlFor="details">
                  <textarea id="details" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} rows={3} placeholder={t("additionalDetailsPlaceholder")} className={fieldClasses(false, "resize-none")} />
                </FormField>
                {error && <div className="rounded-[var(--radius-button)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                <Button type="submit" disabled={submitting} variant="primary" size="block">{submitting ? t("submitting") : t("submitQuoteRequest")}</Button>
              </form>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
