"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { errorMessage } from "@/lib/format";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type MovingType = "office" | "residential" | "freight" | "pet";
type Scope = "small" | "medium" | "large";
type Route = "domestic" | "international";

// General planning ranges, not a quote -- see the disclaimer rendered
// next to the result. Kept as a simple lookup table rather than a
// formula so every number here stays something a human reviewed, not a
// computed guess.
const RANGES: Record<Route, Record<MovingType, Record<Scope, [number, number]>>> = {
  domestic: {
    residential: { small: [150, 350], medium: [350, 700], large: [700, 1500] },
    office: { small: [500, 1200], medium: [1200, 3000], large: [3000, 7000] },
    freight: { small: [300, 800], medium: [800, 2000], large: [2000, 5000] },
    pet: { small: [100, 250], medium: [250, 500], large: [500, 900] },
  },
  international: {
    residential: { small: [1500, 3500], medium: [3500, 7000], large: [7000, 15000] },
    office: { small: [3000, 8000], medium: [8000, 18000], large: [18000, 40000] },
    freight: { small: [1000, 3000], medium: [3000, 8000], large: [8000, 20000] },
    pet: { small: [800, 1500], medium: [1500, 2500], large: [2500, 4000] },
  },
};

const MOVING_TYPES: MovingType[] = ["office", "residential", "freight", "pet"];

function formatUsd(value: number): string {
  return `$${value.toLocaleString("en-US")}`;
}

export default function RelocationCostEstimatorPage() {
  const t = useTranslations("relocationEstimatorPage");
  const [movingType, setMovingType] = useState<MovingType>("residential");
  const [scope, setScope] = useState<Scope>("medium");
  const [route, setRoute] = useState<Route>("international");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", origin: "", destination: "", date: "", details: "" });

  const range = useMemo(() => RANGES[route][movingType][scope], [route, movingType, scope]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/moving-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, email: form.email, phone: form.phone, company: form.company,
          movingType, originCity: form.origin, destinationCity: form.destination,
          preferredDate: form.date,
          details: `[From cost estimator: ${route}, ${scope} scope, estimated ${formatUsd(range[0])}-${formatUsd(range[1])}] ${form.details}`.trim(),
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
        <div className="text-6xl mb-4">📦</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("quoteRequested")}</h1>
        <p className="text-gray-500 mb-6">{t("quoteRequestedHint")}</p>
        <button onClick={() => setSubmitted(false)} className="rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white">{t("startOver")}</button>
      </Card>
    </div>
  );

  return (
    <div>
      <section className="relative overflow-hidden bg-gray-900 py-20">
        <div className="absolute inset-0 opacity-15">
          <Image src="https://images.unsplash.com/photo-1601599963565-b7f49deb2c8e?w=1600&h=600&fit=crop&q=80" alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <p className="text-emerald-300 font-semibold mb-2">{t("ourServices")}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold">{t("title")}</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-2xl">{t("subtitle")}</p>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-4xl px-6">
          <Card shadow="sm" bordered={false} className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{t("calculatorTitle")}</h2>
            <p className="text-sm text-gray-500 mb-6">{t("calculatorSubtitle")}</p>

            <div className="grid gap-4 sm:grid-cols-3 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("movingType")}</label>
                <select value={movingType} onChange={(e) => setMovingType(e.target.value as MovingType)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none">
                  {MOVING_TYPES.map((mt) => <option key={mt} value={mt}>{t(`movingTypes.${mt}`)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("scope")}</label>
                <select value={scope} onChange={(e) => setScope(e.target.value as Scope)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none">
                  <option value="small">{t("scopes.small")}</option>
                  <option value="medium">{t("scopes.medium")}</option>
                  <option value="large">{t("scopes.large")}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("route")}</label>
                <select value={route} onChange={(e) => setRoute(e.target.value as Route)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none">
                  <option value="domestic">{t("routes.domestic")}</option>
                  <option value="international">{t("routes.international")}</option>
                </select>
              </div>
            </div>

            <div className="rounded-2xl gradient-brand p-6 text-center text-white mb-2">
              <p className="text-sm font-semibold opacity-90 mb-1">{t("estimatedRange")}</p>
              <p className="text-3xl font-extrabold">{formatUsd(range[0])} &ndash; {formatUsd(range[1])}</p>
            </div>
            <p className="text-xs text-gray-400 text-center mb-10">{t("disclaimer")}</p>

            <div className="border-t border-gray-100 pt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">{t("requestExactQuote")}</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("name")}</label><input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("email")}</label><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("phone")}</label><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("company")}</label><input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("originCity")}</label><input required type="text" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("destinationCity")}</label><input required type="text" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("preferredMoveDate")}</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("additionalDetails")}</label><textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} rows={3} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none resize-none" /></div>
                {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                <Button type="submit" disabled={submitting} variant="save" size="block">
                  {submitting ? t("submitting") : t("submitQuoteRequest")}
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
