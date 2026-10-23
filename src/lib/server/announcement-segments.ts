import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { isPlaceholderEmail } from "@/lib/login-id";

// Announcing to a group instead of ticked rows: the buyers registered for an exhibition (optionally with a given
// registration status), or not registered, or from a country. The group is worked out here, when sending, so it
// is whoever matches at that moment.

export const MAX_SEGMENT = 3000;
export const SEGMENT_STATUSES = ["any", "none", "pending", "approved", "confirmed", "attended", "rejected", "cancelled", "absent"] as const;
export type SegmentStatus = (typeof SEGMENT_STATUSES)[number];

export interface Segment {
  /** Only buyers with a registration for this exhibition (see status); null for any. */
  exhibitionId: number | null;
  /** "any" = any registration; "none" = no registration; or one status. */
  status: SegmentStatus;
  /** Nationality from the buyer profile (else the country on the account); "" for any. */
  country: string;
}

/** Reads a segment from a request body; null when it is not one. */
export function parseSegment(value: unknown): Segment | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const exhibitionId = v.exhibitionId === null || v.exhibitionId === undefined || v.exhibitionId === "" ? null : Number(v.exhibitionId);
  if (exhibitionId !== null && (!Number.isInteger(exhibitionId) || exhibitionId <= 0)) return null;
  const status = (v.status ?? "any") as SegmentStatus;
  if (!SEGMENT_STATUSES.includes(status)) return null;
  const country = typeof v.country === "string" ? v.country.trim().slice(0, 100) : v.country === undefined || v.country === null ? "" : null;
  if (country === null) return null;
  return { exhibitionId, status, country };
}

const COUNTRY_SQL = "COALESCE(NULLIF(TRIM(p.nationality), ''), NULLIF(TRIM(u.country), ''))";

function whereFor(seg: Segment): { sql: string; params: unknown[] } {
  const parts = ["u.role = 'buyer'", "u.status <> 'suspended'"];
  const params: unknown[] = [];
  if (seg.country) {
    parts.push(`LOWER(${COUNTRY_SQL}) = LOWER(?)`);
    params.push(seg.country);
  }
  const forExpo = seg.exhibitionId !== null ? " AND r.exhibition_id = ?" : "";
  const expoParam = seg.exhibitionId !== null ? [seg.exhibitionId] : [];
  if (seg.status === "none") {
    parts.push(`NOT EXISTS (SELECT 1 FROM expo_registrations r WHERE r.user_id = u.id${forExpo})`);
    params.push(...expoParam);
  } else if (seg.status === "any") {
    if (seg.exhibitionId !== null) {
      parts.push("EXISTS (SELECT 1 FROM expo_registrations r WHERE r.user_id = u.id AND r.exhibition_id = ?)");
      params.push(...expoParam);
    }
  } else {
    parts.push(`EXISTS (SELECT 1 FROM expo_registrations r WHERE r.user_id = u.id AND r.status = ?${forExpo})`);
    params.push(seg.status, ...expoParam);
  }
  return { sql: parts.join(" AND "), params };
}

export interface SegmentResult {
  ids: number[];
  withEmail: number;
  tooMany: boolean;
}

export async function resolveSegment(seg: Segment): Promise<SegmentResult> {
  const { sql, params } = whereFor(seg);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.email FROM users u LEFT JOIN buyer_profiles p ON p.user_id = u.id WHERE ${sql} ORDER BY u.id LIMIT ${MAX_SEGMENT + 1}`,
    params
  );
  const tooMany = rows.length > MAX_SEGMENT;
  const used = tooMany ? rows.slice(0, MAX_SEGMENT) : rows;
  return {
    ids: used.map((r) => Number(r.id)),
    withEmail: used.filter((r) => r.email && !isPlaceholderEmail(String(r.email))).length,
    tooMany,
  };
}

export interface SegmentOptions {
  exhibitions: { id: number; title: string; slug: string; registrations: number }[];
  countries: string[];
}

export async function segmentOptions(): Promise<SegmentOptions> {
  const [expos] = await pool.query<RowDataPacket[]>(
    `SELECT e.id, e.title, e.slug, COUNT(r.id) AS n FROM exhibitions e LEFT JOIN expo_registrations r ON r.exhibition_id = e.id
     GROUP BY e.id, e.title, e.slug ORDER BY e.start_date DESC, e.id DESC LIMIT 300`
  );
  const [countries] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT ${COUNTRY_SQL} AS c FROM users u LEFT JOIN buyer_profiles p ON p.user_id = u.id WHERE u.role = 'buyer' HAVING c IS NOT NULL ORDER BY c LIMIT 300`
  );
  return {
    exhibitions: expos.map((e) => ({ id: Number(e.id), title: String(e.title), slug: String(e.slug), registrations: Number(e.n) })),
    countries: countries.map((c) => String(c.c)),
  };
}

/** A short description for the activity log. */
export function describeSegment(seg: Segment): string {
  return [`exhibition ${seg.exhibitionId ?? "any"}`, `status ${seg.status}`, `country ${seg.country || "any"}`].join(", ");
}
