"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import Button from "@/components/ui/Button";
import FormField, { fieldClasses } from "@/components/ui/FormField";

const CATEGORIES = [
  "Consumer Goods", "Electronics", "Industrial", "Automotive",
  "Food & Beverage", "Manufacturing", "Fashion", "Home & Garden", "Health & Beauty",
];

export default function NewRFQPage() {
  const t = useTranslations("newRfqPage");
  const tc = useTranslations("common");
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
    } catch (err) {
      setError(errorMessage(err, tc("somethingWentWrong")));
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <p className="text-gray-500 mb-4">{t("pleaseLogIn")}</p>
          <Button href="/login" variant="gradientPlain" size="wide">{t("logIn")}</Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-heading">{t("buyRequestPosted")}</h1>
          <p className="text-gray-500 mt-2">{t("redirecting")}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <section className="bg-[var(--color-hero-bg)] py-8">
        <div className="mx-auto max-w-3xl px-6">
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            {t("backToMarketplace")}
          </Link>
          <h1 className="text-3xl font-extrabold text-white">{t("postABuyRequest")}</h1>
          <p className="mt-2 text-gray-400">{t("describeWhatYouNeed")}</p>
        </div>
      </section>

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-3xl px-6">
          <form onSubmit={handleSubmit} className="rounded-[var(--radius-card)] bg-white p-8 shadow-sm border border-gray-100 space-y-5">
            <FormField label={`${t("title")} *`} htmlFor="title">
              <input id="title" required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("titlePlaceholder")} className={fieldClasses()} />
            </FormField>
            <FormField label={`${t("productOrService")} *`} htmlFor="product">
              <input id="product" required type="text" value={product} onChange={(e) => setProduct(e.target.value)} placeholder={t("productPlaceholder")} className={fieldClasses()} />
            </FormField>
            <FormField label={`${t("category")} *`} htmlFor="category">
              <select id="category" required value={category} onChange={(e) => setCategory(e.target.value)} className={fieldClasses()}>
                <option value="">{t("selectCategory")}</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label={`${t("description")} *`} htmlFor="description">
              <textarea id="description" required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("descriptionPlaceholder")} className={fieldClasses(false, "resize-none")} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label={`${t("quantity")} *`} htmlFor="quantity">
                <input id="quantity" required type="text" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder={t("quantityPlaceholder")} className={fieldClasses()} />
              </FormField>
              <FormField label={t("targetPriceOptional")} htmlFor="targetPrice">
                <input id="targetPrice" type="text" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} placeholder={t("targetPricePlaceholder")} className={fieldClasses()} />
              </FormField>
            </div>
            <FormField label={t("deadlineOptional")} htmlFor="deadline">
              <input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={fieldClasses()} />
            </FormField>
            {error && <div className="rounded-[var(--radius-button)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            <Button type="submit" disabled={!canSubmit || submitting} variant="gradientCta" size="blockMd">
              {submitting ? t("posting") : t("postBuyRequest")}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
