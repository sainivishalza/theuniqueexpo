"use client";

import Link from "next/link";
import { getRFQs } from "@/lib/rfq";
import { useAuth } from "@/lib/auth-context";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  quotes_received: "bg-blue-100 text-blue-700",
  awarded: "bg-purple-100 text-purple-700",
  closed: "bg-gray-100 text-gray-500",
};

export default function MarketplacePage() {
  const rfqs = getRFQs();
  const { user } = useAuth();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Procurement Marketplace</h1>
          <p className="mt-2 text-gray-500">
            Browse open buy requests or post your own RFQ.
          </p>
        </div>
        <Link
          href="/marketplace/new"
          className="rounded bg-black px-5 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Post Buy Request
        </Link>
      </div>

      {/* RFQ list */}
      <div className="mt-8 space-y-4">
        {rfqs.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            No buy requests yet. Be the first to post one!
          </div>
        ) : (
          rfqs.map((rfq) => (
            <Link
              key={rfq.id}
              href={`/marketplace/${rfq.id}`}
              className="block rounded-lg border border-gray-200 p-5 transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold hover:underline">{rfq.title}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {rfq.category} • Posted by {rfq.buyerName}
                  </p>
                </div>
                <span
                  className={`ml-4 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[rfq.status]}`}
                >
                  {rfq.status.replace("_", " ")}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600 line-clamp-2">{rfq.description}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-400">
                <span>Qty: {rfq.quantity}</span>
                <span>Target: {rfq.targetPrice}</span>
                <span>Deadline: {rfq.deadline}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
