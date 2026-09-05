import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { listReviews, getReviewSummary, getUserReview, upsertReview, deleteReview } from "@/lib/server/tour-reviews-repo";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getSessionUser(request);

  const [reviews, summary, myReview] = await Promise.all([
    listReviews(slug),
    getReviewSummary(slug),
    user ? getUserReview(slug, user.id) : Promise.resolve(null),
  ]);

  return NextResponse.json({ reviews, summary, myReview });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { slug } = await params;
  const body = await request.json();
  const rating = Number(body.rating);
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
  }

  const review = await upsertReview(slug, user.id, user.name, rating, (body.comment || "").trim());
  return NextResponse.json({ review }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { slug } = await params;
  await deleteReview(slug, user.id);
  return NextResponse.json({ ok: true });
}
