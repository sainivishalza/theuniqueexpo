"use client";

import { useAuth } from "@/lib/auth-context";
import { getRFQs, getQuotesForRFQ } from "@/lib/rfq";
import Link from "next/link";

export default function AdminRFQsPage() {
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    return (
      <main className="flex min-h-[calc(100vh-52px)] items-center justify-center">
        <p className="text-gray-500">Access denied. Admin only.</p>
      </main>
    );
  }

  const rfqs = getRFQs();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        ← Back to admin
      </Link>

      <h1 className="mt-4 text-2xl font-bold">RFQ Review</h1>
      <p className="mt-1 text-sm text-gray-500">
        All buy requests and their submitted quotes.
      </p>

      <div className="mt-6 space-y-4">
        {rfqs.map((rfq) => {
          const quotes = getQuotesForRFQ(rfq.id);
          return (
            <div key={rfq.id} className="rounded-lg border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold">{rfq.title}</h2>
                  <p className="text-sm text-gray-500">
                    {rfq.category} • Posted by {rfq.buyerName} • {rfq.createdAt}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    rfq.status === "open"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {rfq.status.replace("_", " ")}
                </span>
              </div>

              <div className="mt-3 flex gap-4 text-xs text-gray-400">
                <span>Qty: {rfq.quantity}</span>
                <span>Target: {rfq.targetPrice}</span>
                <span>{quotes.length} quote(s)</span>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
