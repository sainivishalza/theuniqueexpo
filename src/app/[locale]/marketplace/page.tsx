"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";

interface RFQ {
  id: string; title: string; product: string; description: string; quantity: string;
  targetPrice: string; deadline: string; category: string; buyerId: string;
  buyerName: string; status: string; createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-green-100 text-green-700 border-green-200",
  quotes_received: "bg-emerald-100 text-emerald-700 border-emerald-200",
  awarded: "bg-purple-100 text-purple-700 border-purple-200",
  closed: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function MarketplacePage() {
  const t = useTranslations("marketplacePage");
  const statusLabels: Record<string, string> = {
    open: t("status.open"),
    quotes_received: t("status.quotesReceived"),
    awarded: t("status.awarded"),
    closed: t("status.closed"),
  };
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetch("/api/rfqs")
      .then((res) => res.json())
      .then((data) => setRfqs(data.rfqs || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gray-900 py-20">
        <div className="absolute inset-0 opacity-15">
          <Image
            src="https://images.unsplash.com/photo-1556740758-90de374c12ad?w=1600&h=600&fit=crop&q=80"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 flex items-end justify-between gap-6">
          <div className="text-white">
            <h1 className="text-4xl md:text-5xl font-extrabold">{t("title")}</h1>
            <p className="mt-3 text-lg text-gray-300 max-w-xl">
              {t("subtitle")}
            </p>
          </div>
          <Link
            href="/marketplace/new"
            className="hidden md:inline-flex items-center gap-2 rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t("postBuyRequest")}
          </Link>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-4 flex gap-8">
          {[
            { label: t("stats.openRfqs"), value: rfqs.filter(r => r.status === "open").length, color: "text-green-600" },
            { label: t("stats.totalRequests"), value: rfqs.length, color: "text-emerald-600" },
            { label: t("stats.activeBuyers"), value: "120+", color: "text-purple-600" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className={`text-2xl font-extrabold ${s.color}`}>{s.value}</span>
              <span className="text-sm text-gray-500">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* RFQ list */}
      <section className="py-12 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between mb-6 md:hidden">
            <h2 className="text-lg font-bold text-gray-900">{t("buyRequests")}</h2>
            <Link
              href="/marketplace/new"
              className="rounded-xl gradient-brand px-4 py-2 text-xs font-semibold text-white"
            >
              {t("newRfq")}
            </Link>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-20 text-gray-400">{t("loadingBuyRequests")}</div>
            ) : rfqs.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
                <div className="text-5xl mb-4">📋</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t("noResultsTitle")}</h3>
                <p className="text-gray-500 mb-6">{t("noResultsSubtitle")}</p>
                <Link
                  href="/marketplace/new"
                  className="inline-flex items-center gap-2 rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white"
                >
                  {t("postFirstRfq")}
                </Link>
              </div>
            ) : (
              rfqs.map((rfq) => (
                <Link
                  key={rfq.id}
                  href={`/marketplace/${rfq.id}`}
                  className="group block rounded-2xl bg-white p-6 shadow-sm border border-gray-100 card-hover"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-lg font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
                          {rfq.title}
                        </h2>
                        <span className={`rounded-lg border px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[rfq.status]}`}>
                          {statusLabels[rfq.status] ?? rfq.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {t("postedBy", { name: rfq.buyerName, category: rfq.category })}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-600 line-clamp-2 leading-relaxed">{rfq.description}</p>
                  <div className="mt-4 flex flex-wrap gap-4 pt-3 border-t border-gray-100">
                    {[
                      { icon: "📦", text: t("qty", { value: rfq.quantity }) },
                      { icon: "💰", text: t("target", { value: rfq.targetPrice }) },
                      { icon: "📅", text: t("deadline", { value: rfq.deadline }) },
                    ].map((item) => (
                      <span key={item.text} className="flex items-center gap-1.5 text-xs text-gray-400">
                        <span>{item.icon}</span> {item.text}
                      </span>
                    ))}
                    <span className="ml-auto text-sm font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform">
                      {t("viewDetails")}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
