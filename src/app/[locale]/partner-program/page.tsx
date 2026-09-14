"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { errorMessage } from "@/lib/format";
import Badge, { normalizeBadgeTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField, { fieldClasses } from "@/components/ui/FormField";

interface PartnerTier {
  id: string;
  name: string;
  tagline: string;
  priceLabel: string;
  commissionRate: string;
  benefits: string[];
  badgeTone: string;
}

export default function PartnerProgramPage() {
  const t = useTranslations("partnerProgramPage");
  const tv = useTranslations("formValidation");
  const [tiers, setTiers] = useState<PartnerTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFormId, setOpenFormId] = useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", message: "" });

  useEffect(() => {
    fetch("/api/partner-tiers")
      .then((res) => res.json())
      .then((data) => setTiers(data.tiers || []))
      .finally(() => setLoading(false));
  }, []);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validate() {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = tv("required");
    if (!form.email.trim()) errors.email = tv("required");
    else if (!EMAIL_RE.test(form.email)) errors.email = tv("invalidEmail");
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent, tierId: string) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/partner-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId, ...form }),
      });
      if (!res.ok) throw new Error((await res.json()).error || t("requestFailed"));
      setSubmittedIds((prev) => [...prev, tierId]);
      setOpenFormId(null);
      setForm({ name: "", email: "", phone: "", company: "", message: "" });
    } catch (err) {
      setError(errorMessage(err, t("requestFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <section className="gradient-hero py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Badge tone="outline-light" size="pill" className="mb-4">{t("eyebrow")}</Badge>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">{t("title")}</h1>
          <p className="mt-4 text-lg text-emerald-100/90 max-w-2xl mx-auto">{t("subtitle")}</p>
        </div>
      </section>

      <section className="py-16 bg-cream-50">
        <div className="mx-auto max-w-6xl px-6">
          {loading ? (
            <p className="text-center text-gray-500 py-10">{t("loading")}</p>
          ) : (
            <div className="grid gap-8 md:grid-cols-3 items-start">
              {tiers.map((tier) => {
                const isSubmitted = submittedIds.includes(tier.id);
                const isFormOpen = openFormId === tier.id;
                return (
                  <Card key={tier.id} shadow="md" className="p-8 flex flex-col h-full">
                    <Badge tone={normalizeBadgeTone(tier.badgeTone)} size="tag" className="self-start mb-4">{tier.name}</Badge>
                    <p className="text-sm text-gray-500 mb-4">{tier.tagline}</p>
                    <div className="text-2xl font-extrabold text-heading mb-1">{tier.priceLabel}</div>
                    <div className="text-sm text-emerald-600 font-semibold mb-6">{tier.commissionRate}</div>
                    <ul className="space-y-3 mb-6 flex-1">
                      {tier.benefits.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-emerald-500 mt-0.5">✓</span>{b}
                        </li>
                      ))}
                    </ul>

                    {isSubmitted ? (
                      <div className="rounded-[var(--radius-button)] bg-green-50 px-4 py-3 text-sm text-green-700 font-medium">{t("applicationReceived")}</div>
                    ) : isFormOpen ? (
                      <form onSubmit={(e) => handleSubmit(e, tier.id)} noValidate className="space-y-3">
                        <FormField label={t("name")} htmlFor={`name-${tier.id}`} error={fieldErrors.name}>
                          <input id={`name-${tier.id}`} type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!fieldErrors.name} className={fieldClasses(!!fieldErrors.name)} />
                        </FormField>
                        <FormField label={t("email")} htmlFor={`email-${tier.id}`} error={fieldErrors.email}>
                          <input id={`email-${tier.id}`} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!fieldErrors.email} className={fieldClasses(!!fieldErrors.email)} />
                        </FormField>
                        <FormField label={t("company")} htmlFor={`company-${tier.id}`}>
                          <input id={`company-${tier.id}`} type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={fieldClasses()} />
                        </FormField>
                        <FormField label={t("phone")} htmlFor={`phone-${tier.id}`}>
                          <input id={`phone-${tier.id}`} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={fieldClasses()} />
                        </FormField>
                        <FormField label={t("messagePlaceholder")} htmlFor={`message-${tier.id}`}>
                          <textarea id={`message-${tier.id}`} rows={2} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={fieldClasses(false, "resize-none")} />
                        </FormField>
                        {error && <div className="rounded-[var(--radius-button)] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
                        <div className="flex gap-2">
                          <Button type="submit" disabled={submitting} variant="primary" size="blockSm" className="flex-1">{submitting ? t("submitting") : t("submitApplication")}</Button>
                          <Button type="button" onClick={() => { setOpenFormId(null); setError(""); setFieldErrors({}); }} variant="ghost" size="compact">{t("cancel")}</Button>
                        </div>
                      </form>
                    ) : (
                      <Button onClick={() => { setOpenFormId(tier.id); setError(""); }} variant="primary" size="blockSm">
                        {t("apply")}
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
