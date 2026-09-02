"use client";
import { use, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { chinaTours } from "@/lib/tours";

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

export default function ApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations("serviceTourApplyPage");
  const TOUR_SERVICES = TOUR_SERVICE_KEYS.map((key) => t(`services.${key}`));
  const { slug } = use(params);
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "", nationality: "", travelers: 1,
    services: [] as string[], specialRequests: "",
  });

  const tour = chinaTours.find((t) => t.slug === slug);

  const toggleService = (s: string) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(s) ? prev.services.filter((x) => x !== s) : [...prev.services, s],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tour || !user) return;
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!tour) return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{t("loading")}</p></div>;
  if (submitted) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-sm">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("applicationSubmitted")}</h1>
        <p className="text-gray-500 mb-6">{t.rich("applicationSubmittedHint", { name: tour.title, strong: (chunks) => <strong>{chunks}</strong> })}</p>
        <Link href="/services/china-tours" className="inline-block rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white">{t("backToTours")}</Link>
      </div>
    </div>
  );

  return (
    <div className="py-12 bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-3xl px-6">
        <Link href={"/services/china-tours/" + tour.slug} className="text-sm text-emerald-600 hover:text-emerald-700 mb-6 inline-block">{t("backTo", { name: tour.title })}</Link>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{t("applyFor", { name: tour.title })}</h1>
        <p className="text-gray-500 mb-8">{t("detailsLine", { dates: tour.dates, duration: tour.duration, price: tour.price })}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl p-8 shadow-sm space-y-5">
            <h2 className="text-xl font-bold text-gray-900">{t("personalInformation")}</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("fullName")}</label><input required type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("email")}</label><input required type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("phone")}</label><input required type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("company")}</label><input type="text" value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("nationality")}</label><input required type="text" value={form.nationality} onChange={(e) => setForm({...form, nationality: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("numberOfTravelers")}</label><input required type="number" min="1" max="30" value={form.travelers} onChange={(e) => setForm({...form, travelers: Number(e.target.value)})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t("selectServices")}</h2>
            <p className="text-sm text-gray-500 mb-4">{t("selectServicesHint")}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {TOUR_SERVICES.map((s) => (
                <label key={s} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${form.services.includes(s) ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <input type="checkbox" checked={form.services.includes(s)} onChange={() => toggleService(s)} className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                  <span className="text-sm text-gray-700">{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t("specialRequests")}</h2>
            <textarea value={form.specialRequests} onChange={(e) => setForm({...form, specialRequests: e.target.value})} rows={4} placeholder={t("specialRequestsPlaceholder")} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none resize-none" />
          </div>

          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <button type="submit" disabled={submitting} className="w-full rounded-xl gradient-brand py-4 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50">
            {submitting ? t("submitting") : t("submitApplication")}
          </button>
        </form>
      </div>
    </div>
  );
}
