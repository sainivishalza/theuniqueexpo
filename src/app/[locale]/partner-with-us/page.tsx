"use client";
import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { errorMessage } from "@/lib/format";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import IconBadge from "@/components/ui/IconBadge";
import FormField, { fieldClasses } from "@/components/ui/FormField";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PARTNER_TYPES = [
  "organizer", "company_brand", "service_provider", "hotel_transportation",
  "factory_supplier", "business_association", "tourism_partner", "other",
];

const TOPICS_KEYS = [
  "exhibitionPromotion", "buyerRecruitment", "businessDelegation", "b2bMatchmaking",
  "businessTours", "supplierNetwork", "localServices", "other",
];

const ORGANIZER_SERVICE_KEYS = [
  "internationalVisitorPromotion", "buyerRecruitment", "hostedBuyerPrograms", "businessDelegations",
  "exhibitionPromotion", "b2bMatchmaking", "businessTours", "onSiteSupport",
];

const SERVICE_PARTNER_KEYS = [
  "hotels", "transportationCompanies", "interpreters", "logisticsCompanies", "inspectionCompanies",
  "sourcingCompanies", "factories", "businessServiceProviders", "tourismCompanies",
];

const COMPANY_SERVICE_KEYS = [
  "exhibitionVisits", "businessTours", "supplierMeetings", "factoryVisits", "businessMatchmaking", "marketExploration",
];

const EMPTY_FORM = { name: "", email: "", whatsapp: "", company: "", website: "", country: "", message: "" };

export default function PartnerWithUsPage() {
  const t = useTranslations("partnerWithUsPage");
  const tv = useTranslations("formValidation");
  const formRef = useRef<HTMLDivElement>(null);
  const [partnerType, setPartnerType] = useState("organizer");
  const [topics, setTopics] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(EMPTY_FORM);

  function scrollToForm(type: string) {
    setPartnerType(type);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleTopic(key: string) {
    setTopics((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  }

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
        body: JSON.stringify({ ...form, partnerType, topics }),
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
        <div className="mx-auto max-w-6xl px-6 space-y-8">
          {/* For Exhibition Organizers */}
          <Card shadow="sm" bordered={false} className="p-8 md:p-10">
            <div className="grid gap-8 md:grid-cols-3 md:items-start">
              <div className="md:col-span-1">
                <IconBadge icon="🎪" size="lg" tint="bg-emerald-50" />
                <h2 className="mt-5 text-2xl font-bold text-heading">{t("organizers.title")}</h2>
                <p className="mt-2 text-gray-500">{t("organizers.subtitle")}</p>
                <Button type="button" variant="gradientCta" size="wide" className="mt-6" onClick={() => scrollToForm("organizer")}>
                  {t("organizers.cta")}
                </Button>
              </div>
              <ul className="md:col-span-2 grid gap-2.5 sm:grid-cols-2">
                {ORGANIZER_SERVICE_KEYS.map((key) => (
                  <li key={key} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="text-gold-600 mt-1 shrink-0 text-[10px]">●</span>
                    {t(`organizers.services.${key}`)}
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* For Business & Service Partners */}
          <Card shadow="sm" bordered={false} className="p-8 md:p-10">
            <div className="grid gap-8 md:grid-cols-3 md:items-start">
              <div className="md:col-span-1">
                <IconBadge icon="🏨" size="lg" tint="bg-gold-50" />
                <h2 className="mt-5 text-2xl font-bold text-heading">{t("servicePartners.title")}</h2>
                <p className="mt-2 text-gray-500">{t("servicePartners.subtitle")}</p>
                <Button type="button" variant="gradientCta" size="wide" className="mt-6" onClick={() => scrollToForm("service_provider")}>
                  {t("servicePartners.cta")}
                </Button>
              </div>
              <ul className="md:col-span-2 grid gap-2.5 sm:grid-cols-2">
                {SERVICE_PARTNER_KEYS.map((key) => (
                  <li key={key} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="text-gold-600 mt-1 shrink-0 text-[10px]">●</span>
                    {t(`servicePartners.examples.${key}`)}
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* For Companies */}
          <Card shadow="sm" bordered={false} className="p-8 md:p-10">
            <div className="grid gap-8 md:grid-cols-3 md:items-start">
              <div className="md:col-span-1">
                <IconBadge icon="🏢" size="lg" tint="bg-emerald-50" />
                <h2 className="mt-5 text-2xl font-bold text-heading">{t("companies.title")}</h2>
                <p className="mt-2 text-gray-500">{t("companies.subtitle")}</p>
                <Button type="button" variant="gradientCta" size="wide" className="mt-6" onClick={() => scrollToForm("company_brand")}>
                  {t("companies.cta")}
                </Button>
              </div>
              <ul className="md:col-span-2 grid gap-2.5 sm:grid-cols-2">
                {COMPANY_SERVICE_KEYS.map((key) => (
                  <li key={key} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="text-gold-600 mt-1 shrink-0 text-[10px]">●</span>
                    {t(`companies.services.${key}`)}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      </section>

      {/* Partnership Form */}
      <section ref={formRef} className="py-16 bg-cream-50 scroll-mt-20">
        <div className="mx-auto max-w-2xl px-6">
          <Card shadow="sm" bordered={false} className="p-6 md:p-10">
            <h2 className="text-2xl font-bold text-heading mb-1">{t("formTitle")}</h2>
            <p className="text-sm text-gray-500 mb-6">{t("formSubtitle")}</p>

            {submitted ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-gray-700 font-semibold">{t("successTitle")}</p>
                <p className="mt-1 text-sm text-gray-500">{t("successSubtitle")}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <p className="block text-sm font-medium text-gray-700 mb-2">{t("iAm")}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {PARTNER_TYPES.map((key) => (
                      <label key={key} className="flex items-center gap-2 text-sm text-gray-700 rounded-[var(--radius-button)] border border-gray-200 px-3 py-2 cursor-pointer hover:bg-white">
                        <input type="radio" name="partnerType" checked={partnerType === key} onChange={() => setPartnerType(key)} className="accent-emerald-800" />
                        {t(`partnerTypes.${key}`)}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label={t("fields.company")} htmlFor="pw-company">
                    <input id="pw-company" className={fieldClasses()} value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
                  </FormField>
                  <FormField label={t("fields.website")} htmlFor="pw-website">
                    <input id="pw-website" className={fieldClasses()} value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
                  </FormField>
                  <FormField label={t("fields.country")} htmlFor="pw-country">
                    <input id="pw-country" className={fieldClasses()} value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
                  </FormField>
                  <FormField label={t("fields.contactPerson")} htmlFor="pw-name" error={fieldErrors.name}>
                    <input id="pw-name" className={fieldClasses(!!fieldErrors.name)} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  </FormField>
                  <FormField label={t("fields.email")} htmlFor="pw-email" error={fieldErrors.email}>
                    <input id="pw-email" type="email" className={fieldClasses(!!fieldErrors.email)} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  </FormField>
                  <FormField label={t("fields.whatsapp")} htmlFor="pw-whatsapp">
                    <input id="pw-whatsapp" className={fieldClasses()} value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} />
                  </FormField>
                </div>

                <div>
                  <p className="block text-sm font-medium text-gray-700 mb-2">{t("whatWouldYouLikeToDiscuss")}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {TOPICS_KEYS.map((key) => (
                      <label key={key} className="flex items-center gap-2 text-sm text-gray-700 rounded-[var(--radius-button)] border border-gray-200 px-3 py-2 cursor-pointer hover:bg-white">
                        <input type="checkbox" checked={topics.includes(key)} onChange={() => toggleTopic(key)} className="accent-emerald-800" />
                        {t(`topics.${key}`)}
                      </label>
                    ))}
                  </div>
                </div>

                <FormField label={t("fields.message")} htmlFor="pw-message">
                  <textarea id="pw-message" rows={4} className={fieldClasses()} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
                </FormField>

                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" variant="gradientCta" size="block" disabled={submitting}>
                  {submitting ? t("submitting") : t("submit")}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}
