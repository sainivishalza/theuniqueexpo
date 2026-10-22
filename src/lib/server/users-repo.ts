import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";
import { formatBuyerNumber } from "@/lib/buyer-number";
import { assignBuyerNumberQuietly, assignMissingBuyerNumbers } from "@/lib/server/buyer-numbers";

export interface AdminUserView {
  id: number;
  name: string;
  email: string;
  role: string;
  status: "active" | "suspended";
  country: string;
  createdAt: number;
  // TUE0001 ... for buyers; empty for every other role.
  buyerNumber: string;
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
    buyerNumber: formatBuyerNumber(row.buyer_no),
  };
}

export async function listUsers(): Promise<AdminUserView[]> {
  await assignMissingBuyerNumbers();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, name, email, role, status, country, created_at, buyer_no FROM users ORDER BY created_at DESC"
  );
  return rows.map(mapUserRow);
}

export async function getUserById(id: number): Promise<AdminUserView | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, name, email, role, status, country, created_at, buyer_no FROM users WHERE id = ? LIMIT 1",
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
  // Someone made a buyer by an admin changing their role gets a number too.
  if (input.role === "buyer") await assignBuyerNumberQuietly(id);
}

export async function deleteUser(id: number) {
  await pool.query("DELETE FROM users WHERE id = ?", [id]);
}

// Also records when the password changed, which ends every session signed before this moment (see
// signedBeforePasswordChange in auth-server.ts). Before migration 061 has run only the hash is saved.
export async function setUserPasswordHash(id: number, passwordHash: string) {
  try {
    await pool.query<ResultSetHeader>("UPDATE users SET password_hash = ?, password_changed_at = ? WHERE id = ?", [
      passwordHash,
      Math.floor(Date.now() / 1000),
      id,
    ]);
  } catch (err) {
    if ((err as { code?: string }).code !== "ER_BAD_FIELD_ERROR") throw err;
    await pool.query<ResultSetHeader>("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, id]);
  }
}
