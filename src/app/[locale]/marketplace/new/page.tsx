"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";

const CATEGORIES = [
  "Consumer Goods", "Electronics", "Industrial", "Automotive",
  "Food & Beverage", "Manufacturing", "Fashion", "Home & Garden", "Health & Beauty",
];

export default function NewRFQPage() {
  const t = useTranslations("newRfqPage");
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [product, setProduct] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [deadline, setDeadline] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = title && product && category && description && quantity && !submitted;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/rfqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, product, category, description, quantity, targetPrice, deadline }),
      });
      if (!res.ok) throw new Error((await res.json()).error || t("failedToPostRequest"));
      setSubmitted(true);
      setTimeout(() => router.push("/marketplace"), 1500);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <p className="text-gray-500 mb-4">{t("pleaseLogIn")}</p>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white">{t("logIn")}</Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900">{t("buyRequestPosted")}</h1>
          <p className="text-gray-500 mt-2">{t("redirecting")}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <section className="bg-gray-900 py-8">
        <div className="mx-auto max-w-3xl px-6">
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            {t("backToMarketplace")}
          </Link>
          <h1 className="text-3xl font-extrabold text-white">{t("postABuyRequest")}</h1>
          <p className="mt-2 text-gray-400">{t("describeWhatYouNeed")}</p>
        </div>
      </section>

      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-3xl px-6">
          <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 space-y-5">
            <Field label={t("title")} placeholder={t("titlePlaceholder")}>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
            </Field>
            <Field label={t("productOrService")} placeholder={t("productPlaceholder")}>
              <input type="text" value={product} onChange={(e) => setProduct(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
            </Field>
            <Field label={t("category")}>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none">
                <option value="">{t("selectCategory")}</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label={t("description")} placeholder={t("descriptionPlaceholder")}>
              <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("quantity")} placeholder={t("quantityPlaceholder")}>
                <input type="text" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
              </Field>
              <Field label={t("targetPriceOptional")} placeholder={t("targetPricePlaceholder")}>
                <input type="text" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
              </Field>
            </div>
            <Field label={t("deadlineOptional")}>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
            </Field>
            {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            <button type="submit" disabled={!canSubmit || submitting} className="w-full rounded-xl gradient-brand py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100">
              {submitting ? t("posting") : t("postBuyRequest")}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function Field({ label, placeholder, children }: { label: string; placeholder?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      {placeholder ? <>{children}</> : children}
    </div>
  );
}
