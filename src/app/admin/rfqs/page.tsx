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

const STATUSES = ["draft", "open", "quotes_received", "awarded", "closed"];

export default function AdminRFQsPage() {
  const { user, loading: authLoading } = useAuth();
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">{rfq.title}</h2>
                <p className="text-sm text-gray-500">
                  {rfq.category} • Posted by {rfq.buyerName} • {rfq.createdAt}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
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

            <div className="mt-3 flex gap-4 text-xs text-gray-400">
              <span>Qty: {rfq.quantity}</span>
              <span>Target: {rfq.targetPrice}</span>
            </div>
          </div>
        ))}
        {!loading && !error && rfqs.length === 0 && (
          <p className="text-center text-gray-400 py-10">No RFQs yet.</p>
        )}
      </div>
    </main>
  );
}
