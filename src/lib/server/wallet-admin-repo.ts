import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { formatBuyerNumber, parseBuyerNumber } from "@/lib/buyer-number";
import { findLedgerMismatches } from "@/lib/server/wallet-repo";

// Read-only lists for the admin screens. Pictures (payment proofs, receipts, payout QR
// codes) are never part of a list -- each is fetched on its own when an admin opens it.

export const ADMIN_PAGE_SIZE = 50;

function iso(value: unknown): string | null {
  return value ? String(value).replace(" ", "T") + "Z" : null;
}

function pageOffset(page: number): number {
  return (Math.max(1, Math.floor(page) || 1) - 1) * ADMIN_PAGE_SIZE;
}

// Matches a buyer by name, e-mail or buyer number (TUE0042 / 42).
function personFilter(alias: string, q: string): { sql: string; params: unknown[] } {
  const text = q.trim();
  if (!text) return { sql: "", params: [] };
  const like = `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const no = parseBuyerNumber(text);
  return {
    sql: ` AND (${alias}.name LIKE ? OR ${alias}.email LIKE ?${no ? ` OR ${alias}.buyer_no = ?` : ""})`,
    params: no ? [like, like, no] : [like, like],
  };
}

function person(r: RowDataPacket) {
  return { userId: r.user_id as number, name: r.name as string, email: r.email as string, buyerNumber: formatBuyerNumber(r.buyer_no) };
}

export interface Overview {
  wallets: number;
  outstandingPoints: number;
  pendingTopups: number;
  pendingWithdrawals: number;
  pendingWithdrawalPoints: number;
  pendingExpenses: number;
  mismatches: Awaited<ReturnType<typeof findLedgerMismatches>>;
}

export async function getOverview(): Promise<Overview> {
  const [[w]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n, COALESCE(SUM(balance), 0) AS total FROM wallets");
  const [[t]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM wallet_topups WHERE status = 'pending'");
  const [[d]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n, COALESCE(SUM(points), 0) AS pts FROM wallet_withdrawals WHERE status = 'pending'");
  const [[x]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM wallet_expense_claims WHERE status = 'pending'");
  return {
    wallets: Number(w.n),
    outstandingPoints: Number(w.total),
    pendingTopups: Number(t.n),
    pendingWithdrawals: Number(d.n),
    pendingWithdrawalPoints: Number(d.pts),
    pendingExpenses: Number(x.n),
    mismatches: await findLedgerMismatches(),
  };
}

const TOPUP_STATUSES = ["pending", "approved", "rejected", "cancelled"];

export async function listTopups(status: string, q: string, page: number) {
  const where = (TOPUP_STATUSES.includes(status) ? " AND t.status = ?" : "") ;
  const filter = personFilter("u", q);
  const params: unknown[] = [...(where ? [status] : []), ...filter.params];
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.id, t.user_id, t.points, t.approved_points, t.reference, t.note, t.status, t.admin_note, t.created_at, t.reviewed_at,
            u.name, u.email, u.buyer_no
     FROM wallet_topups t JOIN users u ON u.id = t.user_id
     WHERE 1 = 1${where}${filter.sql} ORDER BY t.id DESC LIMIT ? OFFSET ?`,
    [...params, ADMIN_PAGE_SIZE + 1, pageOffset(page)]
  );
  return {
    hasMore: rows.length > ADMIN_PAGE_SIZE,
    items: rows.slice(0, ADMIN_PAGE_SIZE).map((r) => ({
      id: r.id as number, ...person(r), points: Number(r.points), approvedPoints: r.approved_points === null ? null : Number(r.approved_points),
      reference: r.reference as string, note: r.note as string, status: r.status as string, adminNote: r.admin_note as string,
      createdAt: iso(r.created_at), reviewedAt: iso(r.reviewed_at),
    })),
  };
}

export async function getTopupProof(id: number): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT proof FROM wallet_topups WHERE id = ?", [id]);
  return rows[0] ? (rows[0].proof as string) : null;
}

const WITHDRAWAL_STATUSES = ["pending", "paid", "rejected", "cancelled"];

export async function listWithdrawals(status: string, q: string, page: number) {
  const where = WITHDRAWAL_STATUSES.includes(status) ? " AND w.status = ?" : "";
  const filter = personFilter("u", q);
  const params: unknown[] = [...(where ? [status] : []), ...filter.params];
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT w.id, w.user_id, w.points, w.method, w.account_name, w.bank_name, w.bank_branch, w.bank_account, (w.qr_image IS NOT NULL) AS has_qr,
            w.note, w.status, w.payout_reference, w.admin_note, w.created_at, w.processed_at, u.name, u.email, u.buyer_no
     FROM wallet_withdrawals w JOIN users u ON u.id = w.user_id
     WHERE 1 = 1${where}${filter.sql} ORDER BY w.id DESC LIMIT ? OFFSET ?`,
    [...params, ADMIN_PAGE_SIZE + 1, pageOffset(page)]
  );
  return {
    hasMore: rows.length > ADMIN_PAGE_SIZE,
    items: rows.slice(0, ADMIN_PAGE_SIZE).map((r) => ({
      id: r.id as number, ...person(r), points: Number(r.points), method: r.method as string, accountName: r.account_name as string,
      bankName: r.bank_name as string, bankBranch: r.bank_branch as string, bankAccount: r.bank_account as string, hasQr: !!r.has_qr,
      note: r.note as string, status: r.status as string, payoutReference: r.payout_reference as string, adminNote: r.admin_note as string,
      createdAt: iso(r.created_at), processedAt: iso(r.processed_at),
    })),
  };
}

export async function getWithdrawalQr(id: number): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT qr_image FROM wallet_withdrawals WHERE id = ?", [id]);
  return rows[0] ? (rows[0].qr_image as string | null) : null;
}

const EXPENSE_STATUSES = ["pending", "approved", "rejected"];

export async function listExpenseClaims(status: string, q: string, page: number) {
  const where = EXPENSE_STATUSES.includes(status) ? " AND c.status = ?" : "";
  const filter = personFilter("u", q);
  const params: unknown[] = [...(where ? [status] : []), ...filter.params];
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT c.id, c.user_id, c.category, c.title, c.expense_date, c.amount_text, c.note, c.receipt_count, c.status, c.points_awarded,
            c.admin_note, c.created_at, c.reviewed_at, e.title AS exhibition_title, u.name, u.email, u.buyer_no
     FROM wallet_expense_claims c JOIN users u ON u.id = c.user_id LEFT JOIN exhibitions e ON e.id = c.exhibition_id
     WHERE 1 = 1${where}${filter.sql} ORDER BY c.id DESC LIMIT ? OFFSET ?`,
    [...params, ADMIN_PAGE_SIZE + 1, pageOffset(page)]
  );
  return {
    hasMore: rows.length > ADMIN_PAGE_SIZE,
    items: rows.slice(0, ADMIN_PAGE_SIZE).map((r) => ({
      id: r.id as number, ...person(r), category: r.category as string, title: r.title as string, expenseDate: r.expense_date as string | null,
      amountText: r.amount_text as string, note: r.note as string, receiptCount: Number(r.receipt_count), status: r.status as string,
      pointsAwarded: r.points_awarded === null ? null : Number(r.points_awarded), adminNote: r.admin_note as string,
      exhibitionTitle: (r.exhibition_title as string | null) ?? "", createdAt: iso(r.created_at), reviewedAt: iso(r.reviewed_at),
    })),
  };
}

export async function getExpenseReceipts(id: number): Promise<string[] | null> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT receipts FROM wallet_expense_claims WHERE id = ?", [id]);
  if (!rows[0]) return null;
  try {
    const parsed = JSON.parse(rows[0].receipts as string);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function listWallets(q: string, page: number) {
  const filter = personFilter("u", q);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT w.user_id, w.balance, w.frozen, u.name, u.email, u.buyer_no, u.status AS user_status
     FROM wallets w JOIN users u ON u.id = w.user_id
     WHERE 1 = 1${filter.sql} ORDER BY w.balance DESC, w.user_id LIMIT ? OFFSET ?`,
    [...filter.params, ADMIN_PAGE_SIZE + 1, pageOffset(page)]
  );
  return {
    hasMore: rows.length > ADMIN_PAGE_SIZE,
    items: rows.slice(0, ADMIN_PAGE_SIZE).map((r) => ({
      ...person(r), balance: Number(r.balance), frozen: !!r.frozen, suspended: r.user_status === "suspended",
    })),
  };
}

export async function getWalletDetail(userId: number, beforeId?: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT w.user_id, w.balance, w.frozen, u.name, u.email, u.buyer_no, u.status AS user_status
     FROM wallets w JOIN users u ON u.id = w.user_id WHERE w.user_id = ?`,
    [userId]
  );
  const r = rows[0];
  if (!r) return null;
  const [tx] = await pool.query<RowDataPacket[]>(
    `SELECT t.id, t.amount, t.balance_after, t.type, t.note, t.ref_type, t.ref_id, t.created_at, t.created_by,
            c.name AS c_name, c.buyer_no AS c_no, a.name AS admin_name
     FROM wallet_transactions t LEFT JOIN users c ON c.id = t.counterparty_user_id LEFT JOIN users a ON a.id = t.created_by
     WHERE t.user_id = ? ${beforeId ? "AND t.id < ?" : ""} ORDER BY t.id DESC LIMIT ?`,
    beforeId ? [userId, beforeId, 101] : [userId, 101]
  );
  return {
    wallet: { ...person(r), balance: Number(r.balance), frozen: !!r.frozen, suspended: r.user_status === "suspended" },
    hasMore: tx.length > 100,
    transactions: tx.slice(0, 100).map((t) => ({
      id: Number(t.id), amount: Number(t.amount), balanceAfter: Number(t.balance_after), type: t.type as string, note: t.note as string,
      refType: t.ref_type as string | null, refId: t.ref_id as number | null, createdAt: iso(t.created_at),
      counterparty: t.c_name ? `${t.c_name} ${formatBuyerNumber(t.c_no)}`.trim() : "", by: (t.admin_name as string | null) ?? "",
    })),
  };
}

export async function listPurchases(q: string, page: number) {
  const filter = personFilter("u", q);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.id, p.user_id, p.tour_id, p.points, p.status, p.admin_note, p.created_at, p.refunded_at, t.title, u.name, u.email, u.buyer_no
     FROM wallet_purchases p JOIN users u ON u.id = p.user_id LEFT JOIN tours t ON t.id = p.tour_id
     WHERE 1 = 1${filter.sql} ORDER BY p.id DESC LIMIT ? OFFSET ?`,
    [...filter.params, ADMIN_PAGE_SIZE + 1, pageOffset(page)]
  );
  return {
    hasMore: rows.length > ADMIN_PAGE_SIZE,
    items: rows.slice(0, ADMIN_PAGE_SIZE).map((r) => ({
      id: r.id as number, ...person(r), tourId: r.tour_id as number, tourTitle: (r.title as string | null) ?? "", points: Number(r.points),
      status: r.status as string, adminNote: r.admin_note as string, createdAt: iso(r.created_at), refundedAt: iso(r.refunded_at),
    })),
  };
}

// ---- points setup: what each exhibition rewards and what each tour costs in points ----

export async function getPointsSetup() {
  const [expos] = await pool.query<RowDataPacket[]>("SELECT id, title, start_date, end_date, attendance_points FROM exhibitions ORDER BY start_date DESC, id DESC");
  const [tours] = await pool.query<RowDataPacket[]>("SELECT id, title, start_date, end_date, price, currency, price_points FROM tours ORDER BY start_date DESC, id DESC");
  return {
    exhibitions: expos.map((r) => ({
      id: r.id as number, title: r.title as string, startDate: String(r.start_date).slice(0, 10), endDate: String(r.end_date).slice(0, 10),
      attendancePoints: Number(r.attendance_points),
    })),
    tours: tours.map((r) => ({
      id: r.id as number, title: r.title as string, startDate: String(r.start_date).slice(0, 10), endDate: String(r.end_date).slice(0, 10),
      price: (r.price as string) ?? "", currency: (r.currency as string) ?? "", pricePoints: r.price_points === null ? 0 : Number(r.price_points),
    })),
  };
}

// 0 switches it off (no reward / not for sale in points).
export async function setExhibitionPoints(id: number, points: number): Promise<boolean> {
  const [res] = await pool.query<import("mysql2/promise").ResultSetHeader>("UPDATE exhibitions SET attendance_points = ? WHERE id = ?", [points, id]);
  return res.affectedRows > 0;
}

export async function setTourPoints(id: number, points: number): Promise<boolean> {
  const [res] = await pool.query<import("mysql2/promise").ResultSetHeader>("UPDATE tours SET price_points = ? WHERE id = ?", [points > 0 ? points : null, id]);
  return res.affectedRows > 0;
}
