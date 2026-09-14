import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";

export interface SlideshowPhotoInput {
  image?: string;
  caption: string;
  displayOrder: number;
}

function mapSlideshowPhotoRow(row: RowDataPacket) {
  return {
    id: String(row.id),
    image: row.image,
    caption: row.caption,
    displayOrder: row.display_order,
    updatedAt: row.updated_at ? Math.floor(new Date(row.updated_at).getTime() / 1000) : 0,
  };
}

// List views only ever render a thumbnail/slide, never re-submit the raw
// photo, so never pull the full column -- point at the dedicated image
// endpoint instead, same reasoning as listTeamMembers.
export async function listSlideshowPhotos() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, caption, display_order, updated_at,
            CONCAT('/api/slideshow-photos/', id, '/image?v=', UNIX_TIMESTAMP(updated_at)) AS image
     FROM homepage_slideshow_photos ORDER BY display_order ASC, id ASC`
  );
  return rows.map(mapSlideshowPhotoRow);
}

// Admin list also skips the raw photo (same reasoning), the edit form
// fetches the real bytes from the /image endpoint only when a photo is
// actually opened for editing -- same pattern the admin team page uses.
export const listSlideshowPhotosForAdmin = listSlideshowPhotos;

export async function getSlideshowPhotoValue(id: number): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT image FROM homepage_slideshow_photos WHERE id = ? LIMIT 1",
    [id]
  );
  const row = rows[0];
  return row ? row.image : null;
}

export async function createSlideshowPhoto(input: SlideshowPhotoInput) {
  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO homepage_slideshow_photos (image, caption, display_order) VALUES (?, ?, ?)",
    [input.image || "", input.caption, input.displayOrder]
  );
  return result.insertId;
}

export async function updateSlideshowPhoto(id: number, input: SlideshowPhotoInput) {
  await pool.query(
    "UPDATE homepage_slideshow_photos SET image=?, caption=?, display_order=? WHERE id=?",
    [input.image || "", input.caption, input.displayOrder, id]
  );
}

export async function deleteSlideshowPhoto(id: number) {
  await pool.query("DELETE FROM homepage_slideshow_photos WHERE id = ?", [id]);
}
