import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { formatBuyerNumber } from "@/lib/buyer-number";
import { notifySupportReply } from "@/lib/server/notifications";
import type { SupportStatus, SupportTopic, SupportWaitingOn } from "@/lib/support";

// "Ask our team": threads of messages between a buyer and the staff. A thread is waiting on the staff after the buyer writes
// and on the buyer after the team answers; an answer the buyer has not opened yet is "unread". Everything here checks that a
// thread belongs to the buyer asking, so one buyer can never read another's messages.

function iso(value: unknown): string {
  return String(value).replace(" ", "T") + "Z";
}

export interface SupportMessage {
  id: number;
  fromStaff: boolean;
  body: string;
  createdAt: string;
}

export interface SupportThreadSummary {
  id: number;
  topic: SupportTopic;
  subject: string;
  status: SupportStatus;
  waitingOn: SupportWaitingOn;
  lastMessageAt: string;
  unread: boolean; // for the buyer: an answer they have not opened yet
}

// ---------- the buyer ----------

const UNREAD_SQL = "(t.waiting_on = 'buyer' AND (t.buyer_read_at IS NULL OR t.buyer_read_at < t.last_message_at))";

export async function listMyThreads(userId: number): Promise<SupportThreadSummary[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.id, t.topic, t.subject, t.status, t.waiting_on, t.last_message_at, ${UNREAD_SQL} AS unread
     FROM support_threads t WHERE t.user_id = ? ORDER BY t.last_message_at DESC, t.id DESC LIMIT 100`,
    [userId]
  );
  return rows.map((r) => ({ id: Number(r.id), topic: r.topic, subject: String(r.subject), status: r.status, waitingOn: r.waiting_on, lastMessageAt: iso(r.last_message_at), unread: !!Number(r.unread) }));
}

export async function countMyUnread(userId: number): Promise<number> {
  const [[row]] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM support_threads t WHERE t.user_id = ? AND ${UNREAD_SQL}`, [userId]);
  return Number(row.n);
}

// A new question. Returns the thread's id.
export async function createThread(userId: number, input: { topic: SupportTopic; subject: string; body: string }): Promise<number> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [ins] = await conn.query<ResultSetHeader>(
      "INSERT INTO support_threads (user_id, topic, subject, status, waiting_on, created_at, last_message_at, buyer_read_at) VALUES (?, ?, ?, 'open', 'staff', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))",
      [userId, input.topic, input.subject]
    );
    await conn.query("INSERT INTO support_messages (thread_id, sender_id, from_staff, body, created_at) VALUES (?, ?, 0, ?, UTC_TIMESTAMP(6))", [ins.insertId, userId, input.body]);
    await conn.commit();
    return ins.insertId;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

async function readMessages(threadId: number): Promise<SupportMessage[]> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id, from_staff, body, created_at FROM support_messages WHERE thread_id = ? ORDER BY id ASC LIMIT 500", [threadId]);
  return rows.map((r) => ({ id: Number(r.id), fromStaff: !!r.from_staff, body: String(r.body), createdAt: iso(r.created_at) }));
}

// One of the buyer's own threads with its messages (opening it marks the answers as read). null when it is not theirs.
export async function getMyThread(userId: number, id: number): Promise<{ thread: SupportThreadSummary; messages: SupportMessage[] } | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.id, t.topic, t.subject, t.status, t.waiting_on, t.last_message_at, ${UNREAD_SQL} AS unread FROM support_threads t WHERE t.id = ? AND t.user_id = ?`,
    [id, userId]
  );
  const r = rows[0];
  if (!r) return null;
  await pool.query("UPDATE support_threads SET buyer_read_at = UTC_TIMESTAMP(6) WHERE id = ? AND user_id = ?", [id, userId]);
  return {
    thread: { id: Number(r.id), topic: r.topic, subject: String(r.subject), status: r.status, waitingOn: r.waiting_on, lastMessageAt: iso(r.last_message_at), unread: !!Number(r.unread) },
    messages: await readMessages(id),
  };
}

// The buyer writes again in one of their own threads (a closed one is opened again). false when it is not theirs.
export async function buyerReply(userId: number, id: number, body: string): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM support_threads WHERE id = ? AND user_id = ?", [id, userId]);
  if (!rows[0]) return false;
  await pool.query("INSERT INTO support_messages (thread_id, sender_id, from_staff, body, created_at) VALUES (?, ?, 0, ?, UTC_TIMESTAMP(6))", [id, userId, body]);
  await pool.query("UPDATE support_threads SET status = 'open', waiting_on = 'staff', last_message_at = UTC_TIMESTAMP(6), buyer_read_at = UTC_TIMESTAMP(6) WHERE id = ?", [id]);
  return true;
}

// ---------- the staff ----------

export interface AdminThreadSummary extends SupportThreadSummary {
  userId: number;
  buyerName: string;
  buyerNumber: string;
  buyerEmail: string;
  messageCount: number;
}

export type AdminThreadFilter = "waiting" | "answered" | "closed" | "all";

export const ADMIN_SUPPORT_PAGE = 30;

export async function listAdminThreads(filter: AdminThreadFilter, q: string, page: number): Promise<{ items: AdminThreadSummary[]; hasMore: boolean }> {
  const where: string[] = [];
  const values: unknown[] = [];
  if (filter === "waiting") where.push("t.status = 'open' AND t.waiting_on = 'staff'");
  else if (filter === "answered") where.push("t.status = 'open' AND t.waiting_on = 'buyer'");
  else if (filter === "closed") where.push("t.status = 'closed'");
  const text = q.trim().slice(0, 100);
  if (text) {
    const like = `%${text.replace(/[\\%_]/g, "\\$&")}%`;
    where.push("(t.subject LIKE ? OR u.name LIKE ? OR u.email LIKE ?)");
    values.push(like, like, like);
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.id, t.user_id, t.topic, t.subject, t.status, t.waiting_on, t.last_message_at, u.name, u.email, u.buyer_no,
            (SELECT COUNT(*) FROM support_messages m WHERE m.thread_id = t.id) AS n
     FROM support_threads t JOIN users u ON u.id = t.user_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY (t.status = 'open' AND t.waiting_on = 'staff') DESC, t.last_message_at DESC, t.id DESC LIMIT ? OFFSET ?`,
    [...values, ADMIN_SUPPORT_PAGE + 1, Math.max(0, page - 1) * ADMIN_SUPPORT_PAGE]
  );
  return {
    hasMore: rows.length > ADMIN_SUPPORT_PAGE,
    items: rows.slice(0, ADMIN_SUPPORT_PAGE).map((r) => ({
      id: Number(r.id), topic: r.topic, subject: String(r.subject), status: r.status, waitingOn: r.waiting_on, lastMessageAt: iso(r.last_message_at), unread: false,
      userId: Number(r.user_id), buyerName: String(r.name), buyerNumber: formatBuyerNumber(r.buyer_no), buyerEmail: String(r.email), messageCount: Number(r.n),
    })),
  };
}

// How many open threads are waiting for the team (for the admin menu).
export async function countWaitingForStaff(): Promise<number> {
  const [[row]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM support_threads WHERE status = 'open' AND waiting_on = 'staff'");
  return Number(row.n);
}

export async function getAdminThread(id: number): Promise<{ thread: AdminThreadSummary; messages: SupportMessage[] } | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.id, t.user_id, t.topic, t.subject, t.status, t.waiting_on, t.last_message_at, u.name, u.email, u.buyer_no
     FROM support_threads t JOIN users u ON u.id = t.user_id WHERE t.id = ?`,
    [id]
  );
  const r = rows[0];
  if (!r) return null;
  const messages = await readMessages(id);
  return {
    thread: {
      id: Number(r.id), topic: r.topic, subject: String(r.subject), status: r.status, waitingOn: r.waiting_on, lastMessageAt: iso(r.last_message_at), unread: false,
      userId: Number(r.user_id), buyerName: String(r.name), buyerNumber: formatBuyerNumber(r.buyer_no), buyerEmail: String(r.email), messageCount: messages.length,
    },
    messages,
  };
}

// The team answers: the thread now waits on the buyer, who is told on the website and by e-mail. false when there is no such thread.
export async function staffReply(adminId: number, id: number, body: string): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT user_id, subject FROM support_threads WHERE id = ?", [id]);
  if (!rows[0]) return false;
  await pool.query("INSERT INTO support_messages (thread_id, sender_id, from_staff, body, created_at) VALUES (?, ?, 1, ?, UTC_TIMESTAMP(6))", [id, adminId, body]);
  await pool.query("UPDATE support_threads SET status = 'open', waiting_on = 'buyer', last_message_at = UTC_TIMESTAMP(6) WHERE id = ?", [id]);
  notifySupportReply(Number(rows[0].user_id), String(rows[0].subject), id);
  return true;
}

export async function setThreadStatus(id: number, status: SupportStatus): Promise<boolean> {
  const [res] = await pool.query<ResultSetHeader>("UPDATE support_threads SET status = ? WHERE id = ?", [status, id]);
  return res.affectedRows > 0;
}
