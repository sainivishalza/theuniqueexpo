"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
          <img
            src="https://images.unsplash.com/photo-1556740758-90de374c12ad?w=1600&h=600&fit=crop&q=80"
            alt=""
            className="img-cover"
          />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 flex items-end justify-between gap-6">
          <div className="text-white">
            <h1 className="text-4xl md:text-5xl font-extrabold">Procurement Marketplace</h1>
            <p className="mt-3 text-lg text-gray-300 max-w-xl">
              Browse open buy requests from verified buyers worldwide.
            </p>
          </div>
          <Link
            href="/marketplace/new"
            className="hidden md:inline-flex items-center gap-2 rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Post Buy Request
          </Link>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-4 flex gap-8">
          {[
            { label: "Open RFQs", value: rfqs.filter(r => r.status === "open").length, color: "text-green-600" },
            { label: "Total Requests", value: rfqs.length, color: "text-emerald-600" },
            { label: "Active Buyers", value: "120+", color: "text-purple-600" },
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
            <h2 className="text-lg font-bold text-gray-900">Buy Requests</h2>
            <Link
              href="/marketplace/new"
              className="rounded-xl gradient-brand px-4 py-2 text-xs font-semibold text-white"
            >
              + New RFQ
            </Link>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-20 text-gray-400">Loading buy requests...</div>
            ) : rfqs.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
                <div className="text-5xl mb-4">📋</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No buy requests yet</h3>
                <p className="text-gray-500 mb-6">Be the first to post a request and find suppliers.</p>
                <Link
                  href="/marketplace/new"
                  className="inline-flex items-center gap-2 rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white"
                >
                  Post Your First RFQ
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
                          {rfq.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Posted by {rfq.buyerName} • {rfq.category}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-600 line-clamp-2 leading-relaxed">{rfq.description}</p>
                  <div className="mt-4 flex flex-wrap gap-4 pt-3 border-t border-gray-100">
                    {[
                      { icon: "📦", text: `Qty: ${rfq.quantity}` },
                      { icon: "💰", text: `Target: ${rfq.targetPrice}` },
                      { icon: "📅", text: `Deadline: ${rfq.deadline}` },
                    ].map((item) => (
                      <span key={item.text} className="flex items-center gap-1.5 text-xs text-gray-400">
                        <span>{item.icon}</span> {item.text}
                      </span>
                    ))}
                    <span className="ml-auto text-sm font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform">
                      View Details →
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
