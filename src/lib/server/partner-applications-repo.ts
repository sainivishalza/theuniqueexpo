import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";

function mapPartnerApplicationRow(row: RowDataPacket) {
  return {
    id: String(row.id),
    tierId: String(row.tier_id),
    tierName: row.tier_name,
    userId: row.user_id ? String(row.user_id) : "",
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function listPartnerApplications() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.*, t.name AS tier_name FROM partner_applications a
     JOIN partner_tiers t ON t.id = a.tier_id
     ORDER BY a.created_at DESC`
  );
  return rows.map(mapPartnerApplicationRow);
}

export async function createPartnerApplication(input: {
  tierId: number; userId?: number; name: string; email: string; phone: string; company: string; message: string;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO partner_applications (tier_id, user_id, name, email, phone, company, message, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [input.tierId, input.userId || null, input.name, input.email, input.phone || "", input.company || "", input.message || ""]
  );
  return result.insertId;
}

export async function updatePartnerApplicationStatus(id: number, status: string) {
  await pool.query("UPDATE partner_applications SET status = ? WHERE id = ?", [status, id]);
}
