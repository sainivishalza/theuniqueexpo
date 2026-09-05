import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { toIsoTimestamp } from "@/lib/server/db-helpers";

function mapReviewRow(row: RowDataPacket) {
  return {
    id: String(row.id),
    tourSlug: row.tour_slug,
    userId: String(row.user_id),
    userName: row.user_name,
    rating: row.rating,
    comment: row.comment || "",
    createdAt: toIsoTimestamp(row.created_at),
  };
}

export async function listReviews(slug: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM tour_reviews WHERE tour_slug = ? ORDER BY created_at DESC",
    [slug]
  );
  return rows.map(mapReviewRow);
}

export async function getReviewSummary(slug: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS count, AVG(rating) AS avg_rating FROM tour_reviews WHERE tour_slug = ?",
    [slug]
  );
  const row = rows[0];
  return {
    count: row?.count || 0,
    average: row?.avg_rating ? Math.round(row.avg_rating * 10) / 10 : 0,
  };
}

// Cross-tour teaser for the /tours listing page's Reviews section, linked
// to from the Tours nav dropdown -- each review links back to its own
// tour's detail page (#reviews) for the full list.
export async function listRecentReviews(limit: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM tour_reviews ORDER BY created_at DESC LIMIT ?",
    [limit]
  );
  return rows.map(mapReviewRow);
}

export async function getUserReview(slug: string, userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM tour_reviews WHERE tour_slug = ? AND user_id = ? LIMIT 1",
    [slug, userId]
  );
  const row = rows[0];
  return row ? mapReviewRow(row) : null;
}

export async function upsertReview(slug: string, userId: number, userName: string, rating: number, comment: string) {
  await pool.query(
    `INSERT INTO tour_reviews (tour_slug, user_id, user_name, rating, comment)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), user_name = VALUES(user_name)`,
    [slug, userId, userName, rating, comment]
  );
  return getUserReview(slug, userId);
}

export async function deleteReview(slug: string, userId: number) {
  await pool.query("DELETE FROM tour_reviews WHERE tour_slug = ? AND user_id = ?", [slug, userId]);
}
