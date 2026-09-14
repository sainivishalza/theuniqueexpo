"use client";
import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { errorMessage } from "@/lib/format";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField, { fieldClasses } from "@/components/ui/FormField";

const TOPIC_KEYS = ["housing", "schools", "visas", "adaptation", "other"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RelocationPage() {
  const t = useTranslations("relocationPage");
  const tv = useTranslations("formValidation");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", email: "", topic: "housing", date: "", questions: "" });

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = tv("required");
    if (!form.email.trim()) errors.email = tv("required");
    else if (!EMAIL_RE.test(form.email)) errors.email = tv("invalidEmail");
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
      <Card shadow="sm" bordered={false} className="text-center max-w-md mx-auto p-8">
        <div className="text-6xl mb-4">🏡</div>
        <h1 className="text-2xl font-bold text-heading mb-2">{t("requestReceived")}</h1>
        <p className="text-gray-500 mb-6">{t("requestReceivedHint")}</p>
        <Button onClick={() => setSubmitted(false)} variant="gradientPlain" size="wide">{t("submitAnother")}</Button>
      </Card>
    </div>
  );

  return (
    <div>
      <section className="relative overflow-hidden bg-[var(--color-hero-bg)] py-20">
        <div className="absolute inset-0 opacity-15">
          <Image src="https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1600&h=600&fit=crop&q=80" alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <h1 className="text-4xl md:text-5xl font-extrabold">{t("title")}</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-2xl">{t("subtitle")}</p>
        </div>
      </section>

      <section className="py-16 bg-cream-50">
        <div className="mx-auto max-w-7xl px-6 grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-heading mb-6">{t("whatWeHelpWith")}</h2>
            <div className="space-y-4">
              {[
                { key: "housing", icon: "🏠" },
                { key: "schools", icon: "🎒" },
                { key: "visas", icon: "🛂" },
                { key: "adaptation", icon: "🧭" },
              ].map((s) => (
                <div key={s.key} className="flex items-start gap-4 p-4 rounded-[var(--radius-card)] bg-white border border-gray-100">
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <h3 className="font-bold text-heading">{t(`topics.${s.key}.title`)}</h3>
                    <p className="text-sm text-gray-500">{t(`topics.${s.key}.desc`)}</p>
                  </div>
                </div>
              ))}
            </div>
            <Card shadow="sm" className="mt-8 p-6">
              <p className="text-sm text-gray-500">
                {t.rich("moreDetail", {
                  visaLink: (chunks) => <Link href="/services/visa-setup" className="text-emerald-600 hover:underline font-semibold">{chunks}</Link>,
                  movingLink: (chunks) => <Link href="/services/moving-assistance" className="text-emerald-600 hover:underline font-semibold">{chunks}</Link>,
                })}
              </p>
            </Card>
            <Link href="/services/relocation-cost-estimator" className="mt-4 flex items-center gap-4 p-4 rounded-[var(--radius-card)] bg-emerald-50 border border-emerald-100 hover:border-emerald-300 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2">
              <span className="text-2xl">🧮</span>
              <div><h3 className="font-bold text-heading">{t("costEstimatorTeaser.title")}</h3><p className="text-sm text-gray-500">{t("costEstimatorTeaser.desc")}</p></div>
            </Link>
          </div>

          <div>
            <Card shadow="sm" bordered={false} className="p-8 sticky top-24">
              <h2 className="text-2xl font-bold text-heading mb-6">{t("requestConsultation")}</h2>
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label={t("name")} htmlFor="name" error={fieldErrors.name}>
                    <input id="name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!fieldErrors.name} className={fieldClasses(!!fieldErrors.name)} />
                  </FormField>
                  <FormField label={t("email")} htmlFor="email" error={fieldErrors.email}>
                    <input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!fieldErrors.email} className={fieldClasses(!!fieldErrors.email)} />
                  </FormField>
                </div>
                <FormField label={t("topic")} htmlFor="topic">
                  <select id="topic" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className={fieldClasses()}>
                    {TOPIC_KEYS.map((key) => <option key={key} value={key}>{t(`topicOptions.${key}`)}</option>)}
                  </select>
                </FormField>
                <FormField label={t("preferredDate")} htmlFor="date">
                  <input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={fieldClasses()} />
                </FormField>
                <FormField label={t("tellUsMore")} htmlFor="questions">
                  <textarea id="questions" value={form.questions} onChange={(e) => setForm({ ...form, questions: e.target.value })} rows={4} placeholder={t("tellUsMorePlaceholder")} className={fieldClasses(false, "resize-none")} />
                </FormField>
                {error && <div className="rounded-[var(--radius-button)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                <Button type="submit" disabled={submitting} variant="primary" size="block">
                  {submitting ? t("submitting") : t("submitRequest")}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
