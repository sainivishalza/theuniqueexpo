"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { errorMessage } from "@/lib/format";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import IconBadge from "@/components/ui/IconBadge";
import FormField, { fieldClasses } from "@/components/ui/FormField";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AUDIENCE_KEYS = [
  { key: "organizers", icon: "🎪" },
  { key: "companies", icon: "🏢" },
] as const;

export default function PartnerWithUsPage() {
  const t = useTranslations("partnerWithUsPage");
  const tv = useTranslations("formValidation");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", email: "", company: "", partnerType: "organizer", message: "" });

  function validate() {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = tv("required");
    if (!form.email.trim()) errors.email = tv("required");
    else if (!EMAIL_RE.test(form.email)) errors.email = tv("invalidEmail");
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/partner-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || t("submitFailed"));
      setSubmitted(true);
    } catch (err) {
      setError(errorMessage(err, t("submitFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <section className="relative overflow-hidden bg-[var(--color-hero-bg)] py-20">
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <h1 className="text-4xl md:text-5xl font-extrabold">{t("title")}</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-2xl">{t("subtitle")}</p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-2 mb-16">
            {AUDIENCE_KEYS.map((a) => (
              <Card key={a.key} shadow="sm" bordered={false} className="p-8">
                <IconBadge icon={a.icon} size="lg" tint="bg-emerald-50" />
                <h2 className="mt-5 text-xl font-bold text-heading">{t(`audiences.${a.key}.title`)}</h2>
                <p className="mt-2 text-gray-500">{t(`audiences.${a.key}.description`)}</p>
              </Card>
            ))}
          </div>

          <div className="mx-auto max-w-xl">
            <Card shadow="sm" bordered={false} className="p-8">
              <h2 className="text-2xl font-bold text-heading mb-1">{t("formTitle")}</h2>
              <p className="text-sm text-gray-500 mb-6">{t("formSubtitle")}</p>

              {submitted ? (
                <div className="text-center py-6">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="text-gray-700 font-semibold">{t("successTitle")}</p>
                  <p className="mt-1 text-sm text-gray-500">{t("successSubtitle")}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <FormField label={t("form.name")} htmlFor="pw-name" error={fieldErrors.name}>
                    <input
                      id="pw-name"
                      className={fieldClasses(!!fieldErrors.name)}
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </FormField>
                  <FormField label={t("form.email")} htmlFor="pw-email" error={fieldErrors.email}>
                    <input
                      id="pw-email"
                      type="email"
                      className={fieldClasses(!!fieldErrors.email)}
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </FormField>
                  <FormField label={t("form.company")} htmlFor="pw-company">
                    <input
                      id="pw-company"
                      className={fieldClasses()}
                      value={form.company}
                      onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    />
                  </FormField>
                  <FormField label={t("form.partnerType")} htmlFor="pw-partner-type">
                    <select
                      id="pw-partner-type"
                      className={fieldClasses()}
                      value={form.partnerType}
                      onChange={(e) => setForm((f) => ({ ...f, partnerType: e.target.value }))}
                    >
                      <option value="organizer">{t("form.partnerTypes.organizer")}</option>
                      <option value="company">{t("form.partnerTypes.company")}</option>
                      <option value="other">{t("form.partnerTypes.other")}</option>
                    </select>
                  </FormField>
                  <FormField label={t("form.message")} htmlFor="pw-message">
                    <textarea
                      id="pw-message"
                      rows={4}
                      className={fieldClasses()}
                      value={form.message}
                      onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    />
                  </FormField>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <Button type="submit" variant="gradientCta" size="block" disabled={submitting}>
                    {submitting ? t("submitting") : t("submit")}
                  </Button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
