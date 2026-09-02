import pool from "@/lib/db";

function toDateStr(d: any) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString();
}

function mapReviewRow(row: any) {
  return {
    id: String(row.id),
    exhibitorSlug: row.exhibitor_slug,
    userId: String(row.user_id),
    userName: row.user_name,
    rating: row.rating,
    comment: row.comment || "",
    createdAt: toDateStr(row.created_at),
  };
}

export async function listReviews(slug: string) {
  const [rows] = await pool.query(
    "SELECT * FROM exhibitor_reviews WHERE exhibitor_slug = ? ORDER BY created_at DESC",
    [slug]
  );
  return (rows as any[]).map(mapReviewRow);
}

export async function getReviewSummary(slug: string) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS count, AVG(rating) AS avg_rating FROM exhibitor_reviews WHERE exhibitor_slug = ?",
    [slug]
  );
  const row = (rows as any[])[0];
  return {
    count: row?.count || 0,
    average: row?.avg_rating ? Math.round(row.avg_rating * 10) / 10 : 0,
  };
}

// Bulk summary for directory-style listings, keyed by slug, so a list page
// doesn't fire one request per card.
export async function getReviewSummaries(slugs: string[]): Promise<Record<string, { count: number; average: number }>> {
  if (slugs.length === 0) return {};
  const [rows] = await pool.query(
    `SELECT exhibitor_slug, COUNT(*) AS count, AVG(rating) AS avg_rating
     FROM exhibitor_reviews WHERE exhibitor_slug IN (?) GROUP BY exhibitor_slug`,
    [slugs]
  );
  const result: Record<string, { count: number; average: number }> = {};
  for (const row of rows as any[]) {
    result[row.exhibitor_slug] = { count: row.count, average: Math.round(row.avg_rating * 10) / 10 };
  }
  return result;
}

export async function getUserReview(slug: string, userId: number) {
  const [rows] = await pool.query(
    "SELECT * FROM exhibitor_reviews WHERE exhibitor_slug = ? AND user_id = ? LIMIT 1",
    [slug, userId]
  );
  const row = (rows as any[])[0];
  return row ? mapReviewRow(row) : null;
}

export async function upsertReview(slug: string, userId: number, userName: string, rating: number, comment: string) {
  await pool.query(
    `INSERT INTO exhibitor_reviews (exhibitor_slug, user_id, user_name, rating, comment)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), user_name = VALUES(user_name)`,
    [slug, userId, userName, rating, comment]
  );
  return getUserReview(slug, userId);
}

export async function deleteReview(slug: string, userId: number) {
  await pool.query("DELETE FROM exhibitor_reviews WHERE exhibitor_slug = ? AND user_id = ?", [slug, userId]);
}
