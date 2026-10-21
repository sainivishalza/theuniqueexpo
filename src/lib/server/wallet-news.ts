import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

// What happened to a buyer's points lately, for the "Rewards news" card on their dashboard:
// points added (a top-up approved, attendance, an expense claim approved, points from the
// team, a returned withdrawal) and withdrawals that were paid or turned down. Read from the
// records the wallet already keeps, so nothing new is stored.

export type NewsKind = "topup" | "attendance" | "expense" | "adjustment" | "refund" | "withdrawal_paid" | "withdrawal_rejected";

export interface NewsItem {
  kind: NewsKind;
  points: number;
  at: string; // ISO time (UTC)
  note: string; // the team's reason for manual points / a rejected withdrawal; empty otherwise
}

const NEWS_DAYS = 30;
const NEWS_LIMIT = 5;

const KIND_BY_TYPE: Record<string, NewsKind> = {
  topup: "topup",
  attendance: "attendance",
  expense: "expense",
  adjustment: "adjustment",
  withdrawal_refund: "refund",
  purchase_refund: "refund",
};

function iso(value: unknown): string {
  return String(value).replace(" ", "T") + "Z";
}

export async function getRecentNews(userId: number): Promise<NewsItem[]> {
  const [ledger] = await pool.query<RowDataPacket[]>(
    `SELECT type, amount, note, created_at FROM wallet_transactions
     WHERE user_id = ? AND amount > 0 AND type IN ('topup','attendance','expense','adjustment','withdrawal_refund','purchase_refund')
       AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${NEWS_DAYS} DAY)
     ORDER BY id DESC LIMIT ${NEWS_LIMIT}`,
    [userId]
  );
  const [withdrawals] = await pool.query<RowDataPacket[]>(
    `SELECT points, status, admin_note, processed_at FROM wallet_withdrawals
     WHERE user_id = ? AND status IN ('paid','rejected') AND processed_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${NEWS_DAYS} DAY)
     ORDER BY processed_at DESC LIMIT ${NEWS_LIMIT}`,
    [userId]
  );
  const items: NewsItem[] = [
    ...ledger.map((r) => ({
      kind: KIND_BY_TYPE[r.type as string],
      points: Number(r.amount),
      at: iso(r.created_at),
      // The team's reason is only shown for points they added by hand.
      note: r.type === "adjustment" ? String(r.note ?? "") : "",
    })),
    ...withdrawals.map((r) => ({
      kind: (r.status === "paid" ? "withdrawal_paid" : "withdrawal_rejected") as NewsKind,
      points: Number(r.points),
      at: iso(r.processed_at),
      note: r.status === "rejected" ? String(r.admin_note ?? "") : "",
    })),
  ];
  return items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, NEWS_LIMIT);
}
