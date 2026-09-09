import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";

export interface TeamMemberInput {
  name: string;
  role: string;
  photo?: string;
  displayOrder: number;
}

function mapTeamMemberRow(row: RowDataPacket) {
  return {
    id: String(row.id),
    name: row.name,
    role: row.role,
    photo: row.photo,
    displayOrder: row.display_order,
    updatedAt: row.updated_at ? Math.floor(new Date(row.updated_at).getTime() / 1000) : 0,
  };
}

// List views only ever render a thumbnail, never re-submit the photo, so
// never pull the raw column -- point at the dedicated photo endpoint
// instead, same reasoning as listExhibitions in exhibitions-repo.ts.
export async function listTeamMembers() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, role, display_order, updated_at,
            IF(LEFT(photo, 5) = 'data:', CONCAT('/api/team-members/', id, '/photo?v=', UNIX_TIMESTAMP(updated_at)), photo) AS photo
     FROM team_members ORDER BY display_order ASC, id ASC`
  );
  return rows.map(mapTeamMemberRow);
}

export async function getTeamMemberById(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM team_members WHERE id = ? LIMIT 1", [id]);
  const row = rows[0];
  return row ? mapTeamMemberRow(row) : null;
}

// Targeted lookup for the dedicated photo-serving route -- avoids pulling
// every other column just to read the (potentially large) photo value.
export async function getTeamMemberPhotoValue(id: number): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT photo FROM team_members WHERE id = ? LIMIT 1", [id]);
  const row = rows[0];
  return row ? row.photo : null;
}

export async function createTeamMember(input: TeamMemberInput) {
  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO team_members (name, role, photo, display_order) VALUES (?, ?, ?, ?)",
    [input.name, input.role, input.photo || null, input.displayOrder]
  );
  return result.insertId;
}

export async function updateTeamMember(id: number, input: TeamMemberInput) {
  await pool.query("UPDATE team_members SET name=?, role=?, photo=?, display_order=? WHERE id=?", [
    input.name,
    input.role,
    input.photo || null,
    input.displayOrder,
    id,
  ]);
}

export async function deleteTeamMember(id: number) {
  await pool.query("DELETE FROM team_members WHERE id = ?", [id]);
}
