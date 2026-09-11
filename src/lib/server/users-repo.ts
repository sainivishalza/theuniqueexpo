import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";

export interface AdminUserView {
  id: number;
  name: string;
  email: string;
  role: string;
  status: "active" | "suspended";
  country: string;
  createdAt: number;
}

function mapUserRow(row: RowDataPacket): AdminUserView {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    country: row.country,
    createdAt: Math.floor(new Date(row.created_at).getTime() / 1000),
  };
}

export async function listUsers(): Promise<AdminUserView[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, name, email, role, status, country, created_at FROM users ORDER BY created_at DESC"
  );
  return rows.map(mapUserRow);
}

export async function getUserById(id: number): Promise<AdminUserView | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, name, email, role, status, country, created_at FROM users WHERE id = ? LIMIT 1",
    [id]
  );
  const row = rows[0];
  return row ? mapUserRow(row) : null;
}

export async function countAdmins(excludingId?: number): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    excludingId
      ? "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND status = 'active' AND id != ?"
      : "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND status = 'active'",
    excludingId ? [excludingId] : []
  );
  return rows[0].count as number;
}

export async function updateUser(id: number, input: { role?: string; status?: "active" | "suspended" }) {
  const fields: string[] = [];
  const values: unknown[] = [];
  if (input.role !== undefined) {
    fields.push("role = ?");
    values.push(input.role);
  }
  if (input.status !== undefined) {
    fields.push("status = ?");
    values.push(input.status);
  }
  if (fields.length === 0) return;
  values.push(id);
  await pool.query<ResultSetHeader>(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deleteUser(id: number) {
  await pool.query("DELETE FROM users WHERE id = ?", [id]);
}

export async function setUserPasswordHash(id: number, passwordHash: string) {
  await pool.query<ResultSetHeader>("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, id]);
}
