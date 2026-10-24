import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { passportLast6, refundPoints, type RefundMode, type RefundRules } from "@/lib/ticket-refund";

// Train-ticket refunds: which exhibitions refund tickets and how much, and what a buyer can claim for.
// The claim itself (createTrainClaim) and its approval live with the other wallet code.

export interface RefundExhibition extends RefundRules {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
}

function rulesOf(r: RowDataPacket): RefundRules {
  return { mode: r.ticket_refund_mode as RefundMode, percent: Number(r.ticket_refund_percent), maxPoints: Number(r.ticket_refund_max_points) };
}

// Every exhibition with its refund rule, upcoming first (for the admin).
export async function listRefundExhibitions(): Promise<RefundExhibition[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, title, start_date, end_date, ticket_refund_mode, ticket_refund_percent, ticket_refund_max_points FROM exhibitions
     ORDER BY end_date < UTC_DATE(), start_date, id LIMIT 500`
  );
  return rows.map((r) => ({ id: Number(r.id), title: String(r.title), startDate: String(r.start_date).slice(0, 10), endDate: String(r.end_date).slice(0, 10), ...rulesOf(r) }));
}

// False when there is no such exhibition. Applies to claims reviewed from now on.
export async function setRefundRules(exhibitionId: number, rules: RefundRules): Promise<boolean> {
  const [res] = await pool.query<ResultSetHeader>(
    "UPDATE exhibitions SET ticket_refund_mode = ?, ticket_refund_percent = ?, ticket_refund_max_points = ? WHERE id = ?",
    [rules.mode, rules.percent, rules.maxPoints, exhibitionId]
  );
  return res.affectedRows === 1;
}

export interface EligibleExhibition extends RefundRules {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  refundedPoints: number; // already approved for this buyer at this exhibition
}

// The exhibitions this buyer can claim a ticket for: they refund tickets, the buyer is registered (approved, confirmed or
// attended), and it is not long over. Plus the buyer's passport ending, which 12306 asks for.
export async function getBuyerRefundOptions(userId: number): Promise<{ exhibitions: EligibleExhibition[]; passportEnding: string; arrangedByUs: { id: number; title: string }[] }> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT e.id, e.title, e.start_date, e.end_date, e.ticket_refund_mode, e.ticket_refund_percent, e.ticket_refund_max_points
     FROM expo_registrations r JOIN exhibitions e ON e.id = r.exhibition_id
     WHERE r.user_id = ? AND r.status IN ('approved','confirmed','attended') AND e.end_date >= DATE_SUB(UTC_DATE(), INTERVAL 120 DAY)
     ORDER BY e.start_date, e.id`,
    [userId]
  );
  const [awarded] = await pool.query<RowDataPacket[]>(
    "SELECT exhibition_id, COALESCE(SUM(points_awarded), 0) AS points FROM wallet_expense_claims WHERE user_id = ? AND kind = 'train' AND status = 'approved' GROUP BY exhibition_id",
    [userId]
  );
  const done = new Map(awarded.map((a) => [Number(a.exhibition_id), Number(a.points)]));
  const [profile] = await pool.query<RowDataPacket[]>("SELECT passport_number FROM buyer_profiles WHERE user_id = ?", [userId]);
  const all = rows.map((r) => ({ id: Number(r.id), title: String(r.title), startDate: String(r.start_date).slice(0, 10), endDate: String(r.end_date).slice(0, 10), ...rulesOf(r), refundedPoints: done.get(Number(r.id)) ?? 0 }));
  return {
    exhibitions: all.filter((x) => x.mode === "refund"),
    arrangedByUs: all.filter((x) => x.mode !== "refund").map((x) => ({ id: x.id, title: x.title })),
    passportEnding: passportLast6(profile[0] ? String(profile[0].passport_number ?? "") : ""),
  };
}

export interface TrainClaimSummary {
  id: number;
  exhibitionTitle: string;
  amountCny: number | null;
  status: string;
  hasInvoice: boolean; // the e-invoice is attached and can be downloaded
  pointsAwarded: number | null;
  adminNote: string;
  createdAt: string;
}

export async function listMyTrainClaims(userId: number): Promise<TrainClaimSummary[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT c.id, c.amount_cny, c.status, c.receipt_count, c.points_awarded, c.admin_note, c.created_at, e.title AS exhibition_title
     FROM wallet_expense_claims c LEFT JOIN exhibitions e ON e.id = c.exhibition_id
     WHERE c.user_id = ? AND c.kind = 'train' ORDER BY c.id DESC LIMIT 50`,
    [userId]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    exhibitionTitle: r.exhibition_title ? String(r.exhibition_title) : "",
    amountCny: r.amount_cny === null ? null : Number(r.amount_cny),
    status: String(r.status),
    hasInvoice: Number(r.receipt_count) >= 2,
    pointsAwarded: r.points_awarded === null ? null : Number(r.points_awarded),
    adminNote: String(r.admin_note ?? ""),
    createdAt: String(r.created_at).replace(" ", "T") + "Z",
  }));
}

// What an approval of this invoice would pay under the exhibition's rule, after what the buyer already got back there.
export function suggestedPoints(amountCny: number | null, rules: RefundRules, refundedBefore: number): number {
  return amountCny === null ? 0 : refundPoints(amountCny, rules, refundedBefore);
}

// The e-invoice of one of this buyer's own requests, as the file they can download (null when there is none yet).
export async function getMyInvoice(userId: number, id: number): Promise<{ bytes: Buffer; contentType: string; extension: string } | null> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT receipts FROM wallet_expense_claims WHERE id = ? AND user_id = ? AND kind = 'train'", [id, userId]);
  if (!rows[0]) return null;
  let files: unknown;
  try {
    files = JSON.parse(String(rows[0].receipts));
  } catch {
    return null;
  }
  const invoice = Array.isArray(files) ? files[1] : null;
  const match = typeof invoice === "string" ? /^data:([a-z/+.-]+);base64,(.+)$/i.exec(invoice) : null;
  if (!match) return null;
  const contentType = match[1].toLowerCase();
  return { bytes: Buffer.from(match[2], "base64"), contentType, extension: contentType === "application/pdf" ? "pdf" : contentType.split("/")[1].replace("jpeg", "jpg") };
}
