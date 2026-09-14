"use client";
import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { errorMessage } from "@/lib/format";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField, { fieldClasses } from "@/components/ui/FormField";

const TOPIC_KEYS = ["marketEntry", "supplierSourcing", "qualityInspection", "legalCompliance", "culturalEtiquette", "tradeCompliance", "ipProtection", "generalConsultation"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ConsultationPage() {
  const t = useTranslations("consultationPage");
  const tv = useTranslations("formValidation");
  const TOPICS = TOPIC_KEYS.map((key) => t(`topicOptions.${key}`));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", email: "", company: "", topic: "", date: "", questions: "" });

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = tv("required");
    if (!form.email.trim()) errors.email = tv("required");
    else if (!EMAIL_RE.test(form.email)) errors.email = tv("invalidEmail");
    if (!form.topic) errors.topic = tv("required");
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/consultation-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, email: form.email, company: form.company,
          topic: form.topic, preferredDate: form.date, questions: form.questions,
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
        <div className="text-6xl mb-4">💬</div>
        <h1 className="text-2xl font-bold text-heading mb-2">{t("consultationBooked")}</h1>
        <p className="text-gray-500 mb-6">{t("consultationBookedHint")}</p>
        <Button onClick={() => setSubmitted(false)} variant="gradientPlain" size="wide">{t("bookAnother")}</Button>
      </Card>
    </div>
  );

  return (
    <div>
      <section className="relative overflow-hidden bg-[var(--color-hero-bg)] py-20">
        <div className="absolute inset-0 opacity-15">
          <Image src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1600&h=600&fit=crop&q=80" alt="" fill priority sizes="100vw" className="object-cover" />
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
            <h2 className="text-2xl font-bold text-heading mb-6">{t("ourConsultationTopics")}</h2>
            <div className="space-y-4">
              {[{key:"marketEntry",icon:"🎯"},{key:"supplierSourcing",icon:"🔍"},{key:"qualityInspection",icon:"✅"},{key:"legalCompliance",icon:"⚖️"},{key:"culturalEtiquette",icon:"🤝"},{key:"tradeCompliance",icon:"📦"},{key:"ipProtectionDetail",icon:"🛡️"}].map((topic) => (
                <div key={topic.key} className="flex items-start gap-4 p-4 rounded-xl bg-white shadow-sm">
                  <span className="text-2xl">{topic.icon}</span>
                  <div><h3 className="font-bold text-heading">{t(`topics.${topic.key}.title`)}</h3><p className="text-sm text-gray-500">{t(`topics.${topic.key}.desc`)}</p></div>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <h3 className="font-[family-name:var(--font-heading)] font-bold text-heading mb-3">{t("pricing")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: t("singleSession"), price: "$150" },
                  { label: t("packageOf4"), price: "$500" },
                  { label: t("monthlyRetainer"), price: "$1,200" },
                  { label: t("freeDiscoveryCall"), price: t("free"), highlight: true },
                ].map((tier) => (
                  <Card key={tier.label} shadow="sm" className="p-4">
                    <div className="text-xs uppercase tracking-[0.08em] text-gray-500">{tier.label}</div>
                    <div className={`mt-1 font-[family-name:var(--font-heading)] text-xl font-bold ${tier.highlight ? "text-emerald-700" : "text-heading"}`}>
                      {tier.price}
                      {!tier.highlight && <span className="ml-1 text-xs font-normal text-gray-400">USD</span>}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
          <div>
            <Card shadow="sm" bordered={false} className="p-8 sticky top-24">
              <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-heading mb-6">{t("bookAConsultation")}</h2>
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label={t("name")} htmlFor="name" error={fieldErrors.name}>
                    <input id="name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!fieldErrors.name} className={fieldClasses(!!fieldErrors.name)} />
                  </FormField>
                  <FormField label={t("email")} htmlFor="email" error={fieldErrors.email}>
                    <input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!fieldErrors.email} className={fieldClasses(!!fieldErrors.email)} />
                  </FormField>
                </div>
                <FormField label={t("company")} htmlFor="company">
                  <input id="company" type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={fieldClasses()} />
                </FormField>
                <FormField label={t("topic")} htmlFor="topic" error={fieldErrors.topic}>
                  <select id="topic" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} aria-invalid={!!fieldErrors.topic} className={fieldClasses(!!fieldErrors.topic)}>
                    <option value="">{t("selectATopic")}</option>{TOPICS.map((topicLabel) => <option key={topicLabel} value={topicLabel}>{topicLabel}</option>)}
                  </select>
                </FormField>
                <FormField label={t("preferredDate")} htmlFor="date">
                  <input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={fieldClasses()} />
                </FormField>
                <FormField label={t("questionsToCover")} htmlFor="questions">
                  <textarea id="questions" value={form.questions} onChange={(e) => setForm({ ...form, questions: e.target.value })} rows={4} placeholder={t("questionsPlaceholder")} className={fieldClasses(false, "resize-none")} />
                </FormField>
                {error && <div className="rounded-[var(--radius-button)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                <Button type="submit" disabled={submitting} variant="primary" size="block">{submitting ? t("booking") : t("bookConsultation")}</Button>
              </form>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
