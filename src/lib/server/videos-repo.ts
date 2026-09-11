import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";

export interface VideoInput {
  title: string;
  description: string;
  embedUrl: string;
  category: string;
  relatedType: "exhibition" | "tour" | "";
  relatedId: string;
  displayOrder: number;
}

function mapVideoRow(row: RowDataPacket) {
  return {
    id: String(row.id),
    title: row.title,
    description: row.description || "",
    embedUrl: row.embed_url,
    category: row.category || "",
    relatedType: row.related_type || "",
    relatedId: row.related_id || "",
    displayOrder: row.display_order,
  };
}

export async function listVideos() {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM videos ORDER BY display_order ASC, id DESC");
  return rows.map(mapVideoRow);
}

// Small, admin-curated set of videos linked to one exhibition/tour -- shown
// as a "Related Videos" section on that item's own detail page.
export async function listVideosForRelated(relatedType: "exhibition" | "tour", relatedId: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM videos WHERE related_type = ? AND related_id = ? ORDER BY display_order ASC, id DESC",
    [relatedType, relatedId]
  );
  return rows.map(mapVideoRow);
}

export async function createVideo(input: VideoInput) {
  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO videos (title, description, embed_url, category, related_type, related_id, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      input.title,
      input.description || "",
      input.embedUrl,
      input.category || "",
      input.relatedType || null,
      input.relatedId || null,
      input.displayOrder,
    ]
  );
  return result.insertId;
}

export async function updateVideo(id: number, input: VideoInput) {
  await pool.query(
    "UPDATE videos SET title=?, description=?, embed_url=?, category=?, related_type=?, related_id=?, display_order=? WHERE id=?",
    [
      input.title,
      input.description || "",
      input.embedUrl,
      input.category || "",
      input.relatedType || null,
      input.relatedId || null,
      input.displayOrder,
      id,
    ]
  );
}

export async function deleteVideo(id: number) {
  await pool.query("DELETE FROM videos WHERE id = ?", [id]);
}
