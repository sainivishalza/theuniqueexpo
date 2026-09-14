"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/ui/Button";

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
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          className={`text-lg leading-none ${onSelect ? "cursor-pointer" : "cursor-default"} ${n <= value ? "text-gold-500" : "text-gray-200"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// Shared by exhibitor profiles and tour detail pages -- same rating/review
// UI, pointed at whichever entity's /reviews API the caller passes in.
export default function ReviewsSection({ apiBasePath, kind }: { apiBasePath: string; kind: "supplier" | "tour" }) {
  const t = useTranslations("reviews");
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState({ average: 0, count: 0 });
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiBasePath)
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
  }, [apiBasePath]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return;
    setSubmitting(true);
    try {
      const res = await fetch(apiBasePath, {
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
    <div className="rounded-[var(--radius-card)] bg-white p-8 shadow-[var(--shadow-card-md)] border border-gray-100">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-heading">{t("reviews")}</h2>
        {summary.count > 0 && (
          <div className="flex items-center gap-2">
            <Stars value={Math.round(summary.average)} />
            <span className="text-sm font-semibold text-gray-700">{summary.average} ({summary.count})</span>
          </div>
        )}
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-6 rounded-[var(--radius-card)] border border-gray-200 p-5 bg-cream-50 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              {myReview ? t("updateYourRating") : t(`rateThis.${kind}`)}
            </label>
            <Stars value={rating} onSelect={setRating} />
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder={t(`shareYourExperience.${kind}`)}
            className="w-full rounded-[var(--radius-button)] border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-900/10 resize-none"
          />
          <Button type="submit" disabled={!rating || submitting} variant="primary" size="compact">
            {submitting ? t("saving") : myReview ? t("updateReview") : t("submitReview")}
          </Button>
        </form>
      ) : (
        <div className="mb-6 rounded-[var(--radius-card)] bg-cream-50 border border-gray-200 p-4 text-sm text-gray-500">
          <Link href="/login" className="text-emerald-800 hover:underline font-semibold">{t("logIn")}</Link>{t("toLeaveAReview")}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {!loading && reviews.length === 0 && (
          <p className="sm:col-span-2 text-sm text-gray-400 text-center py-6">{t("noReviewsYet")}</p>
        )}
        {reviews.map((r) => (
          <div key={r.id} className="rounded-[var(--radius-card)] border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900 text-sm">{r.userName}</span>
              <Stars value={r.rating} />
            </div>
            {r.comment && <p className="text-sm text-gray-600 mt-1.5">{r.comment}</p>}
            <p className="text-xs text-gray-400 mt-2">{new Date(r.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
