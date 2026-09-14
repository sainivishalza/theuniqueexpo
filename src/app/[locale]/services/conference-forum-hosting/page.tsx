"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { errorMessage } from "@/lib/format";
import { DEFAULT_CONFERENCE_HOSTING_CONTENT, type ConferenceHostingContent } from "@/lib/conference-hosting-content";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField, { fieldClasses } from "@/components/ui/FormField";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ConferenceForumHostingPage() {
  const t = useTranslations("conferenceHostingPage");
  const tv = useTranslations("formValidation");
  const [content, setContent] = useState<ConferenceHostingContent>(DEFAULT_CONFERENCE_HOSTING_CONTENT);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", email: "", company: "", eventType: "", expectedAttendees: "", preferredDate: "", details: "" });

  useEffect(() => {
    fetch("/api/conference-hosting-content")
      .then((res) => res.json())
      .then((data) => data.content && setContent(data.content))
      .catch(() => {});
  }, []);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = tv("required");
    if (!form.email.trim()) errors.email = tv("required");
    else if (!EMAIL_RE.test(form.email)) errors.email = tv("invalidEmail");
    if (!form.eventType.trim()) errors.eventType = tv("required");
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/conference-inquiries", {
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
        <div className="text-6xl mb-4">🎤</div>
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
          <p className="text-emerald-300 font-semibold mb-2">{t("ourServices")}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold">{content.title}</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-2xl">{content.subtitle}</p>
        </div>
      </section>
      <section className="py-16 bg-cream-50">
        <div className="mx-auto max-w-7xl px-6 grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-heading mb-6">{t("whatsIncluded")}</h2>
            <div className="space-y-4">
              {content.included.map((item) => (
                <div key={item.title} className="flex items-start gap-4 p-4 rounded-[var(--radius-card)] bg-white border border-gray-100">
                  <span className="text-2xl">{item.icon}</span>
                  <div><h3 className="font-bold text-heading">{item.title}</h3><p className="text-sm text-gray-500">{item.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Card shadow="sm" bordered={false} className="p-8 sticky top-24">
              <h2 className="text-2xl font-bold text-heading mb-6">{t("requestAQuote")}</h2>
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
                <FormField label={t("eventType")} htmlFor="eventType" error={fieldErrors.eventType}>
                  <input id="eventType" type="text" placeholder={t("eventTypePlaceholder")} value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} aria-invalid={!!fieldErrors.eventType} className={fieldClasses(!!fieldErrors.eventType)} />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label={t("expectedAttendees")} htmlFor="expectedAttendees">
                    <input id="expectedAttendees" type="text" placeholder="e.g. 200" value={form.expectedAttendees} onChange={(e) => setForm({ ...form, expectedAttendees: e.target.value })} className={fieldClasses()} />
                  </FormField>
                  <FormField label={t("preferredDate")} htmlFor="preferredDate">
                    <input id="preferredDate" type="date" value={form.preferredDate} onChange={(e) => setForm({ ...form, preferredDate: e.target.value })} className={fieldClasses()} />
                  </FormField>
                </div>
                <FormField label={t("details")} htmlFor="details">
                  <textarea id="details" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} rows={4} placeholder={t("detailsPlaceholder")} className={fieldClasses(false, "resize-none")} />
                </FormField>
                {error && <div className="rounded-[var(--radius-button)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                <Button type="submit" disabled={submitting} variant="save" size="block">{submitting ? t("sending") : t("sendInquiry")}</Button>
              </form>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
