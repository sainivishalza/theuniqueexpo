"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

interface RFQ {
  id: string; title: string; product: string; description: string; quantity: string;
  targetPrice: string; deadline: string; category: string; buyerId: string;
  buyerName: string; status: string; createdAt: string;
}

interface Quote {
  id: string; rfqId: string; exhibitorId: string; exhibitorName: string;
  price: string; leadTime: string; notes: string; status: string; createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-green-100 text-green-700 border border-green-200",
  quotes_received: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  awarded: "bg-purple-100 text-purple-700 border border-purple-200",
  closed: "bg-gray-100 text-gray-500 border border-gray-200",
};

export default function RFQDetailPage() {
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
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-400">Loading...</div>;
  }

  if (!rfq) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">📋</div>
          <h1 className="text-xl font-bold text-gray-900">RFQ not found</h1>
          <Link href="/marketplace" className="mt-3 inline-block text-emerald-600 hover:underline text-sm font-semibold">Back to marketplace →</Link>
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
      if (!res.ok) throw new Error(data.error || "Failed to submit quote");
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
    } catch (err: any) {
      setQuoteError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <section className="bg-gray-900 py-8">
        <div className="mx-auto max-w-4xl px-6">
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to marketplace
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-white">{rfq.title}</h1>
              <p className="mt-2 text-gray-400">Posted by {rfq.buyerName} • {rfq.category}</p>
            </div>
            <span className={`rounded-xl px-3 py-1.5 text-xs font-bold ${STATUS_STYLES[rfq.status]}`}>
              {rfq.status.replace("_", " ")}
            </span>
          </div>
        </div>
      </section>

      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main */}
            <div className="lg:col-span-2 space-y-6">
              {/* Details */}
              <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Request Details</h2>
                <p className="text-gray-600 leading-relaxed mb-6">{rfq.description}</p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Quantity", value: rfq.quantity, icon: "📦" },
                    { label: "Target Price", value: rfq.targetPrice || "Flexible", icon: "💰" },
                    { label: "Deadline", value: rfq.deadline || "Flexible", icon: "📅" },
                  ].map((s) => (
                    <div key={s.label} className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center">
                      <div className="text-xl mb-1">{s.icon}</div>
                      <div className="text-xs text-gray-400">{s.label}</div>
                      <div className="text-sm font-bold text-gray-900 mt-0.5">{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quotes */}
              <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-900">Quotes ({quotes.length})</h2>
                  {user?.role === "exhibitor" && !alreadyQuoted && (
                    <button
                      onClick={() => setShowQuoteForm(!showQuoteForm)}
                      className="rounded-xl gradient-brand px-5 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 hover:shadow-lg transition-all"
                    >
                      Submit Quote
                    </button>
                  )}
                </div>

                {!user && (
                  <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-gray-700 flex items-center justify-between gap-3 flex-wrap">
                    <span>Are you a supplier? Log in to submit a quotation for this request.</span>
                    <Link href="/login" className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors whitespace-nowrap">
                      Log in to quote
                    </Link>
                  </div>
                )}

                {user && user.role !== "exhibitor" && (
                  <div className="mb-6 rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-500">
                    Only supplier (exhibitor) accounts can submit quotes. Register as an exhibitor to respond to buy requests.
                  </div>
                )}

                {showQuoteForm && (
                  <form onSubmit={handleSubmitQuote} className="mb-6 rounded-xl border border-gray-200 p-5 space-y-3 bg-gray-50">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Price</label>
                        <input type="text" placeholder="e.g. $28/unit" value={quotePrice} onChange={(e) => setQuotePrice(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 outline-none" required />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Lead Time</label>
                        <input type="text" placeholder="e.g. 30 days" value={quoteLeadTime} onChange={(e) => setQuoteLeadTime(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 outline-none" required />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                      <textarea rows={3} placeholder="Additional details, MOQ, certifications..." value={quoteNotes} onChange={(e) => setQuoteNotes(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 outline-none resize-none" />
                    </div>
                    {quoteError && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{quoteError}</div>}
                    <button type="submit" disabled={submitting} className="rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 hover:shadow-lg transition-all disabled:opacity-50">
                      {submitting ? "Submitting..." : "Submit Quote"}
                    </button>
                  </form>
                )}

                {quoteSubmitted && (
                  <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-700 font-medium">
                    ✅ Your quote has been submitted successfully!
                  </div>
                )}

                <div className="space-y-4">
                  {quotes.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="text-4xl mb-3">💬</div>
                      <p className="text-gray-400 font-medium">No quotes yet. Be the first to respond!</p>
                    </div>
                  ) : (
                    quotes.map((q) => (
                      <div key={q.id} className="rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-gray-900">{q.exhibitorName}</h3>
                            <p className="text-xs text-gray-400">Submitted {q.createdAt}</p>
                          </div>
                          <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">{q.status}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                          <div><span className="text-gray-400">Price</span><p className="font-bold text-gray-900">{q.price}</p></div>
                          <div><span className="text-gray-400">Lead Time</span><p className="font-bold text-gray-900">{q.leadTime}</p></div>
                        </div>
                        {q.notes && <p className="text-sm text-gray-500 mt-2">{q.notes}</p>}
                        {user && (String(user.id) === rfq.buyerId || String(user.id) === q.exhibitorId) && (
                          <Link
                            href={`/messages/${q.id}`}
                            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline"
                          >
                            💬 {String(user.id) === rfq.buyerId ? "Message Supplier" : "Message Buyer"}
                          </Link>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Request Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Category</span><span className="font-semibold">{rfq.category}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="font-semibold capitalize">{rfq.status.replace("_", " ")}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Quotes</span><span className="font-semibold">{quotes.length}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
