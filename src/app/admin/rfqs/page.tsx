"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

interface RFQ {
  id: string;
  title: string;
  category: string;
  buyerName: string;
  createdAt: string;
  quantity: string;
  targetPrice: string;
  status: string;
}

interface Quote {
  id: string;
  rfqId: string;
  exhibitorName: string;
  price: string;
  leadTime: string;
  notes: string;
  status: string;
  createdAt: string;
}

const STATUSES = ["draft", "open", "quotes_received", "awarded", "closed"];
const QUOTE_STATUSES = ["submitted", "accepted", "rejected"];

export default function AdminRFQsPage() {
  const { user, loading: authLoading } = useAuth();
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quotesByRfq, setQuotesByRfq] = useState<Record<string, Quote[]>>({});
  const [quotesLoading, setQuotesLoading] = useState<string | null>(null);
  const [updatingQuoteId, setUpdatingQuoteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch("/api/rfqs")
      .then((res) => res.json())
      .then((data) => setRfqs(data.rfqs))
      .catch(() => setError("Failed to load RFQs"))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleStatusChange(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/rfqs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Update failed");
      setRfqs((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this RFQ?")) return;
    try {
      const res = await fetch(`/api/admin/rfqs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
      setRfqs((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function toggleQuotes(rfqId: string) {
    if (expandedId === rfqId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(rfqId);
    if (quotesByRfq[rfqId]) return; // already loaded
    setQuotesLoading(rfqId);
    try {
      const res = await fetch(`/api/rfqs/${rfqId}/quotes`);
      const data = await res.json();
      setQuotesByRfq((prev) => ({ ...prev, [rfqId]: data.quotes || [] }));
    } catch {
      setQuotesByRfq((prev) => ({ ...prev, [rfqId]: [] }));
    } finally {
      setQuotesLoading(null);
    }
  }

  async function handleQuoteStatusChange(rfqId: string, quoteId: string, status: string) {
    setUpdatingQuoteId(quoteId);
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Update failed");
      setQuotesByRfq((prev) => ({
        ...prev,
        [rfqId]: prev[rfqId].map((q) => (q.id === quoteId ? { ...q, status } : q)),
      }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingQuoteId(null);
    }
  }

  async function handleQuoteDelete(rfqId: string, quoteId: string) {
    if (!confirm("Delete this quote?")) return;
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
      setQuotesByRfq((prev) => ({
        ...prev,
        [rfqId]: prev[rfqId].filter((q) => q.id !== quoteId),
      }));
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (authLoading) return null;

  if (!user || user.role !== "admin") {
    return (
      <main className="flex min-h-[calc(100vh-52px)] items-center justify-center">
        <p className="text-gray-500">Access denied. Admin only.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        ← Back to admin
      </Link>

      <h1 className="mt-4 text-2xl font-bold">RFQ Review</h1>
      <p className="mt-1 text-sm text-gray-500">
        All buy requests. Update status or remove listings.
      </p>

      {loading && <p className="mt-10 text-center text-gray-400">Loading...</p>}
      {error && <p className="mt-10 text-center text-red-600">{error}</p>}

      <div className="mt-6 space-y-4">
        {rfqs.map((rfq) => (
          <div key={rfq.id} className="rounded-lg border border-gray-200 p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-semibold">{rfq.title}</h2>
                <p className="text-sm text-gray-500">
                  {rfq.category} • Posted by {rfq.buyerName} • {rfq.createdAt}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap sm:flex-shrink-0">
                <select
                  value={rfq.status}
                  disabled={updatingId === rfq.id}
                  onChange={(e) => handleStatusChange(rfq.id, e.target.value)}
                  className="rounded-full border border-gray-200 px-2 py-1 text-xs font-medium disabled:opacity-50"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleDelete(rfq.id)}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
              <span>Qty: {rfq.quantity}</span>
              <span>Target: {rfq.targetPrice}</span>
              <button
                onClick={() => toggleQuotes(rfq.id)}
                className="font-medium text-emerald-600 hover:underline"
              >
                {expandedId === rfq.id ? "Hide quotes" : "View quotes"}
                {quotesByRfq[rfq.id] ? ` (${quotesByRfq[rfq.id].length})` : ""}
              </button>
            </div>

            {expandedId === rfq.id && (
              <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
                {quotesLoading === rfq.id && <p className="text-xs text-gray-400">Loading quotes...</p>}
                {quotesLoading !== rfq.id && quotesByRfq[rfq.id]?.length === 0 && (
                  <p className="text-xs text-gray-400">No quotes submitted yet.</p>
                )}
                {quotesByRfq[rfq.id]?.map((q) => (
                  <div key={q.id} className="rounded-lg bg-gray-50 border border-gray-100 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{q.exhibitorName}</p>
                        <p className="text-xs text-gray-500">
                          Price: {q.price} • Lead time: {q.leadTime} • {q.createdAt}
                        </p>
                        {q.notes && <p className="mt-1 text-xs text-gray-500">{q.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <select
                          value={q.status}
                          disabled={updatingQuoteId === q.id}
                          onChange={(e) => handleQuoteStatusChange(rfq.id, q.id, e.target.value)}
                          className="rounded-full border border-gray-200 px-2 py-1 text-xs font-medium disabled:opacity-50"
                        >
                          {QUOTE_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleQuoteDelete(rfq.id, q.id)}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {!loading && !error && rfqs.length === 0 && (
          <p className="text-center text-gray-400 py-10">No RFQs yet.</p>
        )}
      </div>
    </main>
  );
}
