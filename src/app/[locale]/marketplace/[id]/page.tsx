"use client";

import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import Card from "@/components/ui/Card";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import FormField, { fieldClasses } from "@/components/ui/FormField";

interface RFQ {
  id: string; title: string; product: string; description: string; quantity: string;
  targetPrice: string; deadline: string; category: string; buyerId: string;
  buyerName: string; status: string; createdAt: string;
}

interface Quote {
  id: string; rfqId: string; exhibitorId: string; exhibitorName: string;
  price: string; leadTime: string; notes: string; status: string; createdAt: string;
}

// "awarded" used to be a decorative purple; replaced with the brand's gold
// accent so no off-brand hue leaks into RFQ status pills.
const STATUS_TONES: Record<string, BadgeTone> = {
  open: "success",
  quotes_received: "emerald",
  awarded: "gold",
  closed: "gray",
};

export default function RFQDetailPage() {
  const t = useTranslations("rfqDetailPage");
  const tc = useTranslations("common");
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { user } = useAuth();

  const [rfq, setRfq] = useState<RFQ | null | undefined>(undefined);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteLeadTime, setQuoteLeadTime] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);

  const STATUS_LABELS: Record<string, string> = {
    open: t("statuses.open"),
    quotes_received: t("statuses.quotesReceived"),
    awarded: t("statuses.awarded"),
    closed: t("statuses.closed"),
    submitted: t("statuses.submitted"),
  };

  useEffect(() => {
    if (!id) return;
    fetch(`/api/rfqs/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setRfq(data.rfq))
      .catch(() => setRfq(null));
    fetch(`/api/rfqs/${id}/quotes`)
      .then((res) => (res.ok ? res.json() : { quotes: [] }))
      .then((data) => setQuotes(data.quotes || []))
      .catch(() => {});
  }, [id]);

  if (rfq === undefined) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-400">{t("loading")}</div>;
  }

  if (!rfq) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">📋</div>
          <h1 className="text-xl font-bold text-heading">{t("notFound")}</h1>
          <Link href="/marketplace" className="mt-3 inline-block text-emerald-600 hover:underline text-sm font-semibold">{t("backToMarketplace")}</Link>
        </div>
      </div>
    );
  }

  const alreadyQuoted = quoteSubmitted || quotes.some((q) => q.exhibitorId === String(user?.id));

  async function handleSubmitQuote(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !quotePrice || !quoteLeadTime) return;
    setSubmitting(true);
    setQuoteError("");
    try {
      const res = await fetch(`/api/rfqs/${id}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: quotePrice, leadTime: quoteLeadTime, notes: quoteNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("failedToSubmitQuote"));
      // Reflect the new quote immediately without a full refetch.
      setQuotes((prev) => [
        ...prev,
        {
          id: String(data.id), rfqId: id, exhibitorId: String(user.id), exhibitorName: user.name,
          price: quotePrice, leadTime: quoteLeadTime, notes: quoteNotes, status: "submitted",
          createdAt: new Date().toISOString().split("T")[0],
        },
      ]);
      setQuoteSubmitted(true);
      setShowQuoteForm(false);
    } catch (err) {
      setQuoteError(errorMessage(err, tc("somethingWentWrong")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <section className="bg-[var(--color-hero-bg)] py-8">
        <div className="mx-auto max-w-4xl px-6">
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            {t("backToMarketplaceShort")}
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-white">{rfq.title}</h1>
              <p className="mt-2 text-gray-400">{t("postedBy", { name: rfq.buyerName, category: rfq.category })}</p>
            </div>
            <Badge tone={STATUS_TONES[rfq.status] || "gray"} size="pill" className="font-bold whitespace-nowrap">
              {STATUS_LABELS[rfq.status] || rfq.status.replace("_", " ")}
            </Badge>
          </div>
        </div>
      </section>

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main */}
            <div className="lg:col-span-2 space-y-6">
              {/* Details */}
              <Card shadow="sm" className="p-8">
                <h2 className="text-lg font-bold text-heading mb-4">{t("requestDetails")}</h2>
                <p className="text-gray-600 leading-relaxed mb-6">{rfq.description}</p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: t("quantity"), value: rfq.quantity, icon: "📦" },
                    { label: t("targetPrice"), value: rfq.targetPrice || t("flexible"), icon: "💰" },
                    { label: t("deadline"), value: rfq.deadline || t("flexible"), icon: "📅" },
                  ].map((s) => (
                    <div key={s.label} className="p-4 rounded-[var(--radius-card)] bg-cream-50 border border-gray-100 text-center">
                      <div className="text-xl mb-1">{s.icon}</div>
                      <div className="text-xs text-gray-400">{s.label}</div>
                      <div className="text-sm font-bold text-gray-900 mt-0.5">{s.value}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Quotes */}
              <Card shadow="sm" className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-heading">{t("quotesCount", { count: quotes.length })}</h2>
                  {user?.role === "exhibitor" && !alreadyQuoted && (
                    <Button onClick={() => setShowQuoteForm(!showQuoteForm)} variant="gradientCta" size="compact">
                      {t("submitQuote")}
                    </Button>
                  )}
                </div>

                {!user && (
                  <div className="mb-6 rounded-[var(--radius-card)] bg-emerald-50 border border-emerald-100 p-4 text-sm text-gray-700 flex items-center justify-between gap-3 flex-wrap">
                    <span>{t("areYouASupplier")}</span>
                    <Link href="/login" className="rounded-[var(--radius-button)] bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2">
                      {t("logInToQuote")}
                    </Link>
                  </div>
                )}

                {user && user.role !== "exhibitor" && (
                  <div className="mb-6 rounded-[var(--radius-card)] bg-cream-50 border border-gray-200 p-4 text-sm text-gray-500">
                    {t("onlySupplierAccounts")}
                  </div>
                )}

                {showQuoteForm && (
                  <form onSubmit={handleSubmitQuote} className="mb-6 rounded-[var(--radius-card)] border border-gray-200 p-5 space-y-3 bg-cream-50">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label={t("price")} htmlFor="quotePrice">
                        <input id="quotePrice" type="text" placeholder={t("pricePlaceholder")} value={quotePrice} onChange={(e) => setQuotePrice(e.target.value)} className={fieldClasses()} required />
                      </FormField>
                      <FormField label={t("leadTime")} htmlFor="quoteLeadTime">
                        <input id="quoteLeadTime" type="text" placeholder={t("leadTimePlaceholder")} value={quoteLeadTime} onChange={(e) => setQuoteLeadTime(e.target.value)} className={fieldClasses()} required />
                      </FormField>
                    </div>
                    <FormField label={t("notes")} htmlFor="quoteNotes">
                      <textarea id="quoteNotes" rows={3} placeholder={t("notesPlaceholder")} value={quoteNotes} onChange={(e) => setQuoteNotes(e.target.value)} className={fieldClasses(false, "resize-none")} />
                    </FormField>
                    {quoteError && <div className="rounded-[var(--radius-button)] border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{quoteError}</div>}
                    <Button type="submit" disabled={submitting} variant="primary" size="compact">
                      {submitting ? t("submitting") : t("submitQuote")}
                    </Button>
                  </form>
                )}

                {quoteSubmitted && (
                  <div className="mb-6 rounded-[var(--radius-card)] bg-green-50 border border-green-200 p-4 text-sm text-green-700 font-medium">
                    {t("quoteSubmittedSuccess")}
                  </div>
                )}

                <div className="space-y-4">
                  {quotes.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="text-4xl mb-3">💬</div>
                      <p className="text-gray-400 font-medium">{t("noQuotesYet")}</p>
                    </div>
                  ) : (
                    quotes.map((q) => (
                      <div key={q.id} className="rounded-[var(--radius-card)] border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-heading">{q.exhibitorName}</h3>
                            <p className="text-xs text-gray-400">{t("submittedOn", { date: q.createdAt })}</p>
                          </div>
                          <Badge tone="emerald" size="tag">{STATUS_LABELS[q.status] || q.status}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                          <div><span className="text-gray-400">{t("price")}</span><p className="font-bold text-gray-900">{q.price}</p></div>
                          <div><span className="text-gray-400">{t("leadTime")}</span><p className="font-bold text-gray-900">{q.leadTime}</p></div>
                        </div>
                        {q.notes && <p className="text-sm text-gray-500 mt-2">{q.notes}</p>}
                        {user && (String(user.id) === rfq.buyerId || String(user.id) === q.exhibitorId) && (
                          <Link
                            href={`/messages/${q.id}`}
                            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline"
                          >
                            💬 {String(user.id) === rfq.buyerId ? t("messageSupplier") : t("messageBuyer")}
                          </Link>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card shadow="sm" className="p-6">
                <h3 className="text-sm font-bold text-heading mb-3">{t("requestInfo")}</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">{t("category")}</span><span className="font-semibold">{rfq.category}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{t("status")}</span><span className="font-semibold capitalize">{STATUS_LABELS[rfq.status] || rfq.status.replace("_", " ")}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{t("quotes")}</span><span className="font-semibold">{quotes.length}</span></div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
