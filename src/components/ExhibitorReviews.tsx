"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

function Stars({ value, onSelect }: { value: number; onSelect?: (n: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onSelect}
          onClick={() => onSelect?.(n)}
          className={`text-lg leading-none ${onSelect ? "cursor-pointer" : "cursor-default"} ${n <= value ? "text-amber-400" : "text-gray-200"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ExhibitorReviews({ slug }: { slug: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState({ average: 0, count: 0 });
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/exhibitors/${slug}/reviews`)
      .then((res) => (res.ok ? res.json() : { reviews: [], summary: { average: 0, count: 0 }, myReview: null }))
      .then((data) => {
        setReviews(data.reviews || []);
        setSummary(data.summary || { average: 0, count: 0 });
        if (data.myReview) {
          setMyReview(data.myReview);
          setRating(data.myReview.rating);
          setComment(data.myReview.comment);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/exhibitors/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMyReview(data.review);
      setReviews((prev) => {
        const withoutMine = prev.filter((r) => r.userId !== data.review.userId);
        return [data.review, ...withoutMine];
      });
      setSummary((prev) => {
        const wasReviewed = !!myReview;
        const count = wasReviewed ? prev.count : prev.count + 1;
        const total = wasReviewed ? prev.average * prev.count - myReview!.rating + rating : prev.average * prev.count + rating;
        return { count, average: Math.round((total / count) * 10) / 10 };
      });
    } catch {
      // best-effort -- form stays filled so the user can retry
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-900">Reviews</h2>
        {summary.count > 0 && (
          <div className="flex items-center gap-2">
            <Stars value={Math.round(summary.average)} />
            <span className="text-sm font-semibold text-gray-700">{summary.average} ({summary.count})</span>
          </div>
        )}
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-200 p-5 bg-gray-50 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              {myReview ? "Update your rating" : "Rate this supplier"}
            </label>
            <Stars value={rating} onSelect={setRating} />
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Share your experience working with this supplier..."
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 outline-none resize-none"
          />
          <button
            type="submit"
            disabled={!rating || submitting}
            className="rounded-xl gradient-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Saving..." : myReview ? "Update Review" : "Submit Review"}
          </button>
        </form>
      ) : (
        <div className="mb-6 rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-500">
          <Link href="/login" className="text-emerald-600 hover:underline font-semibold">Log in</Link> to leave a review.
        </div>
      )}

      <div className="space-y-4">
        {!loading && reviews.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">No reviews yet. Be the first to share your experience.</p>
        )}
        {reviews.map((r) => (
          <div key={r.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900 text-sm">{r.userName}</span>
              <Stars value={r.rating} />
            </div>
            {r.comment && <p className="text-sm text-gray-600 mt-1.5">{r.comment}</p>}
            <p className="text-xs text-gray-400 mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
