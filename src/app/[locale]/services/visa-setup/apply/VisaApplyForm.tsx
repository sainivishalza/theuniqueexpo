"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField, { fieldClasses } from "@/components/ui/FormField";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function VisaApplyForm({ service }: { service: { id: string; type: string; title: string } | null }) {
  const t = useTranslations("visaApplyPage");
  const tc = useTranslations("common");
  const tv = useTranslations("formValidation");
  const { user, loading: authLoading } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", nationality: "", details: "" });

  if (!service) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <Card shadow="sm" bordered={false} className="text-center max-w-md mx-auto p-8">
          <h1 className="text-2xl font-bold text-heading mb-2">{t("unknownService")}</h1>
          <p className="text-gray-500 mb-6">{t("unknownServiceHint")}</p>
          <Button href="/services/visa-setup" variant="gradientPlain" size="wide">{t("backToServices")}</Button>
        </Card>
      </div>
    );
  }

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = tv("required");
    if (!form.email.trim()) errors.email = tv("required");
    else if (!EMAIL_RE.test(form.email)) errors.email = tv("invalidEmail");
    if (!form.phone.trim()) errors.phone = tv("required");
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !validate()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/visa-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: service.id, serviceType: service.title, ...form }),
      });
      if (!res.ok) throw new Error((await res.json()).error || t("submissionFailed"));
      setSubmitted(true);
    } catch (err) {
      setError(errorMessage(err, tc("somethingWentWrong")));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <Card shadow="sm" bordered={false} className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-heading mb-2">{t("successTitle")}</h1>
          <p className="text-gray-500 mb-6">{t("successText", { name: service.title })}</p>
          <Button href="/services/visa-setup" variant="gradientPlain" size="wide">{t("backToServices")}</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-12 bg-cream-50 min-h-screen">
      <div className="mx-auto max-w-3xl px-6">
        <Link href="/services/visa-setup" className="text-sm text-emerald-600 hover:text-emerald-700 mb-6 inline-block">{t("backToServices")}</Link>
        <h1 className="text-3xl font-extrabold text-heading mb-2">{t("title", { name: service.title })}</h1>
        <p className="text-gray-500 mb-8">{t("subtitle")}</p>

        {!authLoading && !user && (
          <div className="mb-6 rounded-[var(--radius-button)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t("loginRequired")}{" "}
            <Link href="/login" className="font-semibold underline">{t("logIn")}</Link>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <Card shadow="sm" bordered={false} className="p-8 space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <FormField label={t("fullName")} htmlFor="name" error={fieldErrors.name}>
                <input id="name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!fieldErrors.name} className={fieldClasses(!!fieldErrors.name)} />
              </FormField>
              <FormField label={t("email")} htmlFor="email" error={fieldErrors.email}>
                <input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!fieldErrors.email} className={fieldClasses(!!fieldErrors.email)} />
              </FormField>
              <FormField label={t("phone")} htmlFor="phone" error={fieldErrors.phone}>
                <input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} aria-invalid={!!fieldErrors.phone} className={fieldClasses(!!fieldErrors.phone)} />
              </FormField>
              <FormField label={t("company")} htmlFor="company">
                <input id="company" type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={fieldClasses()} />
              </FormField>
              <FormField label={t("nationality")} htmlFor="nationality">
                <input id="nationality" type="text" value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} className={fieldClasses()} />
              </FormField>
            </div>
            <FormField label={t("details")} htmlFor="details">
              <textarea id="details" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} rows={4} placeholder={t("detailsPlaceholder")} className={fieldClasses(false, "resize-none")} />
            </FormField>
          </Card>

          {error && <div className="rounded-[var(--radius-button)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <Button type="submit" disabled={submitting || !user} variant="primary" size="blockLg">
            {submitting ? t("submitting") : t("submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
