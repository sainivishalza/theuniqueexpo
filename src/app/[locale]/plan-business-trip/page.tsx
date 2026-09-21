"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { errorMessage } from "@/lib/format";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField, { fieldClasses } from "@/components/ui/FormField";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NEEDS_KEYS = [
  "hotel", "airportTransfer", "exhibitionTransfer", "exhibitionAccompaniment", "interpreter",
  "supplierMeetings", "factoryVisits", "supplierSearch", "samples", "additionalChinaTrip",
];

interface Exhibition {
  slug: string;
  title: string;
}

const EMPTY_FORM = {
  name: "", company: "", email: "", whatsapp: "", country: "", departureCity: "",
  exhibitionSlug: "", arrivalDate: "", departureDate: "", travelers: "1",
  needs: [] as string[], industry: "", message: "",
};

export default function PlanBusinessTripPage() {
  const t = useTranslations("planBusinessTripPage");
  const tv = useTranslations("formValidation");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(EMPTY_FORM);

  const tourType = searchParams.get("tourType") || "";

  useEffect(() => {
    fetch(`/api/exhibitions?locale=${locale}`)
      .then((res) => res.json())
      .then((data) => setExhibitions(data.exhibitions || []));
  }, [locale]);

  useEffect(() => {
    const exhibitionSlug = searchParams.get("exhibitionSlug");
    if (exhibitionSlug) setForm((f) => ({ ...f, exhibitionSlug }));
  }, [searchParams]);

  function toggleNeed(key: string) {
    setForm((prev) => ({
      ...prev,
      needs: prev.needs.includes(key) ? prev.needs.filter((n) => n !== key) : [...prev.needs, key],
    }));
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
      const res = await fetch("/api/business-trip-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, travelers: Number(form.travelers) || 1, attendingType: "traveling", tourType }),
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
      <section className="relative overflow-hidden bg-[var(--color-hero-bg)] py-16">
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-white">
          <h1 className="text-4xl md:text-5xl font-extrabold">{t("title")}</h1>
          <p className="mt-3 text-lg text-gray-300">{t("subtitle")}</p>
        </div>
      </section>

      <section className="py-14 bg-cream-50">
        <div className="mx-auto max-w-2xl px-6">
          <Card shadow="sm" bordered={false} className="p-6 md:p-10">
            {tourType && (
              <div className="mb-6 rounded-[var(--radius-card)] bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {t("selectedTourType", { tourType: t(`tourTypeLabels.${tourType}`) })}
              </div>
            )}

            {submitted ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-gray-700 font-semibold">{t("successTitle")}</p>
                <p className="mt-1 text-sm text-gray-500">{t("successSubtitle")}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label={t("fields.name")} htmlFor="pbt-name" error={fieldErrors.name}>
                    <input id="pbt-name" className={fieldClasses(!!fieldErrors.name)} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  </FormField>
                  <FormField label={t("fields.company")} htmlFor="pbt-company">
                    <input id="pbt-company" className={fieldClasses()} value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
                  </FormField>
                  <FormField label={t("fields.email")} htmlFor="pbt-email" error={fieldErrors.email}>
                    <input id="pbt-email" type="email" className={fieldClasses(!!fieldErrors.email)} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  </FormField>
                  <FormField label={t("fields.whatsapp")} htmlFor="pbt-whatsapp">
                    <input id="pbt-whatsapp" className={fieldClasses()} value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} />
                  </FormField>
                  <FormField label={t("fields.country")} htmlFor="pbt-country">
                    <input id="pbt-country" className={fieldClasses()} value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
                  </FormField>
                  <FormField label={t("fields.departureCity")} htmlFor="pbt-departure-city">
                    <input id="pbt-departure-city" className={fieldClasses()} value={form.departureCity} onChange={(e) => setForm((f) => ({ ...f, departureCity: e.target.value }))} />
                  </FormField>
                </div>

                <FormField label={t("fields.exhibition")} htmlFor="pbt-exhibition">
                  <select id="pbt-exhibition" className={fieldClasses()} value={form.exhibitionSlug} onChange={(e) => setForm((f) => ({ ...f, exhibitionSlug: e.target.value }))}>
                    <option value="">{t("fields.exhibitionPlaceholder")}</option>
                    {exhibitions.map((e) => (
                      <option key={e.slug} value={e.slug}>{e.title}</option>
                    ))}
                  </select>
                </FormField>

                <div className="grid gap-5 sm:grid-cols-3">
                  <FormField label={t("fields.arrivalDate")} htmlFor="pbt-arrival">
                    <input id="pbt-arrival" type="date" className={fieldClasses()} value={form.arrivalDate} onChange={(e) => setForm((f) => ({ ...f, arrivalDate: e.target.value }))} />
                  </FormField>
                  <FormField label={t("fields.departureDate")} htmlFor="pbt-departure">
                    <input id="pbt-departure" type="date" className={fieldClasses()} value={form.departureDate} onChange={(e) => setForm((f) => ({ ...f, departureDate: e.target.value }))} />
                  </FormField>
                  <FormField label={t("fields.travelers")} htmlFor="pbt-travelers">
                    <input id="pbt-travelers" type="number" min={1} className={fieldClasses()} value={form.travelers} onChange={(e) => setForm((f) => ({ ...f, travelers: e.target.value }))} />
                  </FormField>
                </div>

                <div>
                  <p className="block text-sm font-medium text-gray-700 mb-2">{t("whatDoYouNeed")}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {NEEDS_KEYS.map((key) => (
                      <label key={key} className="flex items-center gap-2 text-sm text-gray-700 rounded-[var(--radius-button)] border border-gray-200 px-3 py-2 cursor-pointer hover:bg-cream-50">
                        <input type="checkbox" checked={form.needs.includes(key)} onChange={() => toggleNeed(key)} className="accent-emerald-800" />
                        {t(`needs.${key}`)}
                      </label>
                    ))}
                  </div>
                </div>

                <FormField label={t("fields.industry")} htmlFor="pbt-industry">
                  <input id="pbt-industry" className={fieldClasses()} value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} />
                </FormField>

                <FormField label={t("fields.message")} htmlFor="pbt-message">
                  <textarea id="pbt-message" rows={4} className={fieldClasses()} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
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
