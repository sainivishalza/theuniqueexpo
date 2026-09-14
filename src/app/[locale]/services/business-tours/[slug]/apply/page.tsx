"use client";
import { use, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import { businessToursData, localizeTour } from "@/lib/tours";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField, { fieldClasses } from "@/components/ui/FormField";

const TOUR_SERVICE_KEYS = [
  "purchaseOfTickets",
  "hotelAccommodation",
  "exhibitionRegistration",
  "visaDocumentationSupport",
  "professionalEscort",
  "interpreter",
  "factoryVisits",
  "airportTransfers",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations("serviceTourApplyPage");
  const tc = useTranslations("common");
  const tv = useTranslations("formValidation");
  const locale = useLocale();
  const TOUR_SERVICES = TOUR_SERVICE_KEYS.map((key) => t(`services.${key}`));
  const { slug } = use(params);
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "", nationality: "", travelers: 1,
    services: [] as string[], specialRequests: "",
  });

  const tourData = businessToursData.find((d) => d.slug === slug);
  const tour = tourData ? localizeTour(tourData, locale) : undefined;

  const toggleService = (s: string) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(s) ? prev.services.filter((x) => x !== s) : [...prev.services, s],
    }));
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = tv("required");
    if (!form.email.trim()) errors.email = tv("required");
    else if (!EMAIL_RE.test(form.email)) errors.email = tv("invalidEmail");
    if (!form.phone.trim()) errors.phone = tv("required");
    if (!form.nationality.trim()) errors.nationality = tv("required");
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tour || !user) return;
    if (!validate()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/tour-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourId: tour.id, name: form.name, email: form.email,
          phone: form.phone, company: form.company, nationality: form.nationality,
          travelers: form.travelers, services: form.services, specialRequests: form.specialRequests,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || t("submissionFailed"));
      setSubmitted(true);
    } catch (err) {
      setError(errorMessage(err, tc("somethingWentWrong")));
    } finally {
      setSubmitting(false);
    }
  };

  if (!tour) return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{t("loading")}</p></div>;
  if (submitted) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card shadow="sm" bordered={false} className="text-center max-w-md mx-auto p-8">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-heading mb-2">{t("applicationSubmitted")}</h1>
        <p className="text-gray-500 mb-6">{t.rich("applicationSubmittedHint", { name: tour.title, strong: (chunks) => <strong>{chunks}</strong> })}</p>
        <Button href="/services/business-tours" variant="gradientPlain" size="wide">{t("backToTours")}</Button>
      </Card>
    </div>
  );

  return (
    <div className="py-12 bg-cream-50 min-h-screen">
      <div className="mx-auto max-w-3xl px-6">
        <Link href={"/services/business-tours/" + tour.slug} className="text-sm text-emerald-600 hover:text-emerald-700 mb-6 inline-block">{t("backTo", { name: tour.title })}</Link>
        <h1 className="text-3xl font-extrabold text-heading mb-2">{t("applyFor", { name: tour.title })}</h1>
        <p className="text-gray-500 mb-8">{t("detailsLine", { dates: tour.dates, duration: tour.duration, price: tour.price })}</p>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <Card shadow="sm" bordered={false} className="p-8 space-y-5">
            <h2 className="text-xl font-bold text-heading">{t("personalInformation")}</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <FormField label={t("fullName")} htmlFor="name" error={fieldErrors.name}>
                <input id="name" type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} aria-invalid={!!fieldErrors.name} className={fieldClasses(!!fieldErrors.name)} />
              </FormField>
              <FormField label={t("email")} htmlFor="email" error={fieldErrors.email}>
                <input id="email" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} aria-invalid={!!fieldErrors.email} className={fieldClasses(!!fieldErrors.email)} />
              </FormField>
              <FormField label={t("phone")} htmlFor="phone" error={fieldErrors.phone}>
                <input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} aria-invalid={!!fieldErrors.phone} className={fieldClasses(!!fieldErrors.phone)} />
              </FormField>
              <FormField label={t("company")} htmlFor="company">
                <input id="company" type="text" value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} className={fieldClasses()} />
              </FormField>
              <FormField label={t("nationality")} htmlFor="nationality" error={fieldErrors.nationality}>
                <input id="nationality" type="text" value={form.nationality} onChange={(e) => setForm({...form, nationality: e.target.value})} aria-invalid={!!fieldErrors.nationality} className={fieldClasses(!!fieldErrors.nationality)} />
              </FormField>
              <FormField label={t("numberOfTravelers")} htmlFor="travelers">
                <input id="travelers" type="number" min="1" max="30" value={form.travelers} onChange={(e) => setForm({...form, travelers: Number(e.target.value)})} className={fieldClasses()} />
              </FormField>
            </div>
          </Card>

          <Card shadow="sm" bordered={false} className="p-8">
            <h2 className="text-xl font-bold text-heading mb-4">{t("selectServices")}</h2>
            <p className="text-sm text-gray-500 mb-4">{t("selectServicesHint")}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {TOUR_SERVICES.map((s) => (
                <label key={s} className={`flex items-start gap-3 p-4 rounded-[var(--radius-card)] border cursor-pointer transition-colors ${form.services.includes(s) ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <input type="checkbox" checked={form.services.includes(s)} onChange={() => toggleService(s)} className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                  <span className="text-sm text-gray-700">{s}</span>
                </label>
              ))}
            </div>
          </Card>

          <Card shadow="sm" bordered={false} className="p-8">
            <h2 className="text-xl font-bold text-heading mb-4">{t("specialRequests")}</h2>
            <textarea value={form.specialRequests} onChange={(e) => setForm({...form, specialRequests: e.target.value})} rows={4} placeholder={t("specialRequestsPlaceholder")} className={fieldClasses(false, "resize-none")} />
          </Card>

          {error && <div className="rounded-[var(--radius-button)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <Button type="submit" disabled={submitting} variant="primary" size="blockLg">
            {submitting ? t("submitting") : t("submitApplication")}
          </Button>
        </form>
      </div>
    </div>
  );
}
