import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { getClientIp } from "@/lib/server/rate-limit";

// "Who did what" in the admin area. Writing a line never slows or fails the action it describes:
// it runs in the background and any error is only logged on the server.

export interface AuditActor {
  id: number;
  name: string;
}

export interface AuditEntry {
  targetType?: string;
  targetId?: string | number;
  details?: string;
}

export function logAdminAction(request: Request | null, actor: AuditActor | null, action: string, entry: AuditEntry = {}): void {
  const ip = request ? getClientIp(request) : "";
  void pool
    .query(
      "INSERT INTO admin_audit_log (admin_id, admin_name, action, target_type, target_id, details, ip) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        actor?.id ?? null,
        (actor?.name ?? "").slice(0, 255),
        action.slice(0, 64),
        (entry.targetType ?? "").slice(0, 32),
        String(entry.targetId ?? "").slice(0, 64),
        (entry.details ?? "").slice(0, 1000),
        ip.slice(0, 64),
      ]
    )
    .catch((err) => {
      // The table does not exist until migration 063 has run.
      if ((err as { code?: string }).code !== "ER_NO_SUCH_TABLE") console.error("audit log write failed:", err);
    });
}

export interface AuditRow {
  id: number;
  adminId: number | null;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  ip: string;
  createdAt: number;
}

export interface AuditQuery {
  q?: string;
  action?: string;
  adminId?: number;
  page?: number;
  pageSize?: number;
}

export async function listAuditLog(query: AuditQuery): Promise<{ rows: AuditRow[]; total: number; actions: string[]; admins: { id: number; name: string }[] }> {
  const pageSize = Math.min(Math.max(query.pageSize ?? 50, 1), 200);
  const page = Math.max(query.page ?? 1, 1);
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (query.q) {
    const like = `%${query.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    where.push("(details LIKE ? OR admin_name LIKE ? OR target_id LIKE ? OR action LIKE ?)");
    params.push(like, like, like, like);
  }
  if (query.action) {
    where.push("action = ?");
    params.push(query.action);
  }
  if (query.adminId) {
    where.push("admin_id = ?");
    params.push(query.adminId);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  try {
    const [[count]] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM admin_audit_log ${clause}`, params);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, admin_id, admin_name, action, target_type, target_id, details, ip, UNIX_TIMESTAMP(created_at) AS ts
       FROM admin_audit_log ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );
    const [actions] = await pool.query<RowDataPacket[]>("SELECT DISTINCT action FROM admin_audit_log ORDER BY action");
    const [admins] = await pool.query<RowDataPacket[]>(
      "SELECT admin_id AS id, MAX(admin_name) AS name FROM admin_audit_log WHERE admin_id IS NOT NULL GROUP BY admin_id ORDER BY name"
    );
    return {
      total: Number(count.n),
      rows: rows.map((r) => ({
        id: Number(r.id),
        adminId: r.admin_id == null ? null : Number(r.admin_id),
        adminName: String(r.admin_name),
        action: String(r.action),
        targetType: String(r.target_type),
        targetId: String(r.target_id),
        details: String(r.details),
        ip: String(r.ip),
        createdAt: Number(r.ts),
      })),
      actions: actions.map((a) => String(a.action)),
      admins: admins.map((a) => ({ id: Number(a.id), name: String(a.name) })),
    };
  } catch (err) {
    if ((err as { code?: string }).code === "ER_NO_SUCH_TABLE") return { rows: [], total: 0, actions: [], admins: [] };
    throw err;
  }
}
