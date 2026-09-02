import pool from "@/lib/db";
import { mapExhibitionRow } from "@/lib/server/exhibitions-repo";

export async function listFavoriteIds(userId: number): Promise<string[]> {
  const [rows] = await pool.query("SELECT exhibition_id FROM exhibition_favorites WHERE user_id = ?", [userId]);
  return (rows as any[]).map((r) => String(r.exhibition_id));
}

// Joined with the exhibitions table (same image-endpoint rewrite as
// listExhibitions) so a saved-exhibitions view doesn't need a second
// round trip or embed raw base64 posters.
export async function listFavoriteExhibitions(userId: number) {
  const [rows] = await pool.query(
    `SELECT e.id, e.slug, e.title, e.start_date, e.end_date, e.venue, e.city, e.country, e.industry,
            e.description, e.highlights, e.exhibitors, e.visitors, e.organizer, e.website, e.color,
            e.registration_enabled, e.registration_form_schema, e.updated_at,
            IF(LEFT(e.image, 5) = 'data:', CONCAT('/api/exhibitions/', e.slug, '/image?v=', UNIX_TIMESTAMP(e.updated_at)), e.image) AS image
     FROM exhibition_favorites f
     JOIN exhibitions e ON e.id = f.exhibition_id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return (rows as any[]).map(mapExhibitionRow);
}

export async function addFavorite(userId: number, exhibitionId: number) {
  await pool.query(
    "INSERT IGNORE INTO exhibition_favorites (user_id, exhibition_id) VALUES (?, ?)",
    [userId, exhibitionId]
  );
}

export async function removeFavorite(userId: number, exhibitionId: number) {
  await pool.query("DELETE FROM exhibition_favorites WHERE user_id = ? AND exhibition_id = ?", [userId, exhibitionId]);
}
