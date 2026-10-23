import crypto from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { getBuyerDocument } from "@/lib/server/buyer-profile-repo";

// Links that let someone without an account see ONE buyer document for a limited time (for example a visa agent who
// needs a passport scan). Only the SHA-256 of the link is stored, so a copy of the database holds no working links.
// A link stops working when it expires or when an admin revokes it; every opening is counted.

export const SHARE_HOURS = [1, 24, 72, 168] as const;
export const MAX_ACTIVE_PER_DOCUMENT = 5;

export interface ShareLink {
  id: number;
  docKey: string;
  createdByName: string;
  createdAt: string;
  expiresAt: string;
  views: number;
  lastViewedAt: string | null;
}

function missing(err: unknown): boolean {
  return (err as { code?: string }).code === "ER_NO_SUCH_TABLE";
}

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

function toLink(r: RowDataPacket): ShareLink {
  const iso = (v: unknown) => (v ? new Date(String(v).replace(" ", "T") + "Z").toISOString() : null);
  return {
    id: Number(r.id),
    docKey: String(r.doc_key),
    createdByName: String(r.created_by_name ?? ""),
    createdAt: iso(r.created_at) as string,
    expiresAt: iso(r.expires_at) as string,
    views: Number(r.views ?? 0),
    lastViewedAt: iso(r.last_viewed_at),
  };
}

/** Active (not expired, not revoked) links of one buyer's document, newest first. */
export async function listShareLinks(userId: number, docKey: string): Promise<ShareLink[]> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, doc_key, created_by_name, created_at, expires_at, views, last_viewed_at FROM document_share_links WHERE user_id = ? AND doc_key = ? AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP() ORDER BY id DESC",
      [userId, docKey]
    );
    return rows.map(toLink);
  } catch (err) {
    if (missing(err)) return [];
    throw err;
  }
}

/** Makes a link. The token is returned once and never stored. */
export async function createShareLink(
  admin: { id: number; name: string },
  userId: number,
  docKey: string,
  hours: number
): Promise<{ token: string; expiresAt: string } | "limit" | "no_document" | "unavailable"> {
  if (!(await getBuyerDocument(userId, docKey))) return "no_document";
  const token = crypto.randomBytes(32).toString("base64url");
  try {
    if ((await listShareLinks(userId, docKey)).length >= MAX_ACTIVE_PER_DOCUMENT) return "limit";
    await pool.query(
      "INSERT INTO document_share_links (token_hash, user_id, doc_key, created_by, created_by_name, created_at, expires_at) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? HOUR))",
      [hashToken(token), userId, docKey, admin.id, admin.name.slice(0, 255), hours]
    );
    const [rows] = await pool.query<RowDataPacket[]>("SELECT expires_at FROM document_share_links WHERE token_hash = ?", [hashToken(token)]);
    return { token, expiresAt: toLink({ ...rows[0], id: 0, doc_key: docKey }).expiresAt };
  } catch (err) {
    if (missing(err)) return "unavailable";
    throw err;
  }
}

/** Stops a link at once. `true` when it was active. */
export async function revokeShareLink(userId: number, docKey: string, id: number): Promise<boolean> {
  try {
    const [r] = await pool.query<ResultSetHeader>(
      "UPDATE document_share_links SET revoked_at = UTC_TIMESTAMP() WHERE id = ? AND user_id = ? AND doc_key = ? AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP()",
      [id, userId, docKey]
    );
    return r.affectedRows === 1;
  } catch (err) {
    if (missing(err)) return false;
    throw err;
  }
}

/** The document a link points to, or null when the link is unknown, expired or revoked (all look the same from outside). */
export async function openShareLink(token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, user_id, doc_key FROM document_share_links WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP()",
      [hashToken(token)]
    );
    if (!rows[0]) return null;
    const value = await getBuyerDocument(Number(rows[0].user_id), String(rows[0].doc_key)).catch(() => null);
    if (!value) return null;
    await pool.query("UPDATE document_share_links SET views = views + 1, last_viewed_at = UTC_TIMESTAMP() WHERE id = ?", [rows[0].id]);
    return value;
  } catch (err) {
    if (missing(err)) return null;
    throw err;
  }
}
