"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { getRFQById, getQuotesForRFQ, createQuote } from "@/lib/rfq";
import { useAuth } from "@/lib/auth-context";
import { mockExhibitorProfiles } from "@/lib/booths";

export default function RFQDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const rfq = getRFQById(id);
  const quotes = getQuotesForRFQ(id);
  const { user } = useAuth();
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteLeadTime, setQuoteLeadTime] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);

  if (!rfq) {
    return (
      <main className="flex min-h-[calc(100vh-52px)] items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">RFQ not found.</p>
          <Link href="/marketplace" className="mt-2 text-sm text-gray-500 hover:underline">
            ← Back to marketplace
          </Link>
        </div>
      </main>
    );
  }

  const handleSubmitQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !quotePrice || !quoteLeadTime) return;

    const profile = mockExhibitorProfiles.find((p) => p.id === user.id);
    createQuote({
      rfqId: rfq.id,
      exhibitorId: user.id,
      exhibitorName: profile?.name || user.name || user.email,
      price: quotePrice,
      leadTime: quoteLeadTime,
      notes: quoteNotes,
    });

    setQuoteSubmitted(true);
    setShowQuoteForm(false);
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/marketplace" className="text-sm text-gray-500 hover:underline">
        ← Back to marketplace
      </Link>

      {/* RFQ Header */}
      <div className="mt-6 rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold">{rfq.title}</h1>
          <span
            className={`ml-4 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              rfq.status === "open"
                ? "bg-green-100 text-green-700"
                : rfq.status === "quotes_received"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-500"
            }`}
          >
            {rfq.status.replace("_", " ")}
          </span>
        </div>

        <p className="mt-1 text-sm text-gray-500">
          Posted by {rfq.buyerName} • {rfq.category}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Quantity</span>
            <p className="font-medium">{rfq.quantity}</p>
          </div>
          <div>
            <span className="text-gray-400">Target Price</span>
            <p className="font-medium">{rfq.targetPrice || "Flexible"}</p>
          </div>
          <div>
            <span className="text-gray-400">Deadline</span>
            <p className="font-medium">{rfq.deadline || "Flexible"}</p>
          </div>
        </div>

        <div className="mt-4">
          <span className="text-xs text-gray-400">Description</span>
          <p className="mt-1 text-sm text-gray-600">{rfq.description}</p>
        </div>
      </div>

      {/* Quotes */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Quotes ({quotes.length})
          </h2>
          {user?.role === "exhibitor" && !quoteSubmitted && (
            <button
              onClick={() => setShowQuoteForm(!showQuoteForm)}
              className="rounded bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              Submit Quote
            </button>
          )}
        </div>

        {/* Quote form */}
        {showQuoteForm && (
          <form onSubmit={handleSubmitQuote} className="mt-4 rounded-lg border border-gray-200 p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500">Price</label>
                <input
                  type="text"
                  placeholder="e.g. $28 per unit"
                  value={quotePrice}
                  onChange={(e) => setQuotePrice(e.target.value)}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Lead Time</label>
                <input
                  type="text"
                  placeholder="e.g. 30 days"
                  value={quoteLeadTime}
                  onChange={(e) => setQuoteLeadTime(e.target.value)}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">Notes</label>
              <textarea
                rows={3}
                placeholder="Additional details, MOQ, certifications..."
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none resize-none"
              />
            </div>
            <button
              type="submit"
              className="rounded bg-black px-5 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              Submit Quote
            </button>
          </form>
        )}

        {quoteSubmitted && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            ✅ Your quote has been submitted!
          </div>
        )}

        {/* Quote cards */}
        <div className="mt-4 space-y-3">
          {quotes.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              No quotes yet. Be the first to submit one!
            </div>
          ) : (
            quotes.map((q) => (
              <div
                key={q.id}
                className="rounded-lg border border-gray-200 p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{q.exhibitorName}</h3>
                    <p className="text-xs text-gray-400">
                      Submitted {q.createdAt}
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {q.status}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Price</span>
                    <p className="font-medium">{q.price}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Lead Time</span>
                    <p className="font-medium">{q.leadTime}</p>
                  </div>
                </div>
                {q.notes && (
                  <p className="mt-2 text-sm text-gray-600">{q.notes}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
