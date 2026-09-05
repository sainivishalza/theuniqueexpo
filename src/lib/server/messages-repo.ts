import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";
import { toIsoTimestamp } from "@/lib/server/db-helpers";

function mapMessageRow(row: RowDataPacket) {
  return {
    id: String(row.id),
    threadId: String(row.thread_id),
    senderId: String(row.sender_id),
    senderName: row.sender_name,
    body: row.body,
    createdAt: toIsoTimestamp(row.created_at),
  };
}

function mapThreadRow(row: RowDataPacket) {
  return {
    id: String(row.id),
    quoteId: String(row.quote_id),
    rfqId: String(row.rfq_id),
    rfqTitle: row.rfq_title,
    buyerId: String(row.buyer_id),
    buyerName: row.buyer_name,
    exhibitorId: String(row.exhibitor_id),
    exhibitorName: row.exhibitor_name,
    quotePrice: row.quote_price,
    lastMessageBody: row.last_message_body || "",
    lastMessageAt: row.last_message_at ? toIsoTimestamp(row.last_message_at) : toIsoTimestamp(row.created_at),
    createdAt: toIsoTimestamp(row.created_at),
  };
}

// A thread is identified by its quote -- one conversation per quote, so the
// buyer and exhibitor always have the request/price context alongside the
// messages. Created lazily on first access rather than when the quote
// itself is submitted, since most quotes never get a follow-up message.
export async function getOrCreateThreadForQuote(quoteId: number) {
  const [existing] = await pool.query<RowDataPacket[]>("SELECT * FROM message_threads WHERE quote_id = ? LIMIT 1", [quoteId]);
  const existingRow = existing[0];
  if (existingRow) return existingRow;

  const [quoteRows] = await pool.query<RowDataPacket[]>(
    "SELECT q.rfq_id, q.exhibitor_id, r.buyer_id FROM quotes q JOIN rfqs r ON r.id = q.rfq_id WHERE q.id = ? LIMIT 1",
    [quoteId]
  );
  const quote = quoteRows[0];
  if (!quote) return null;

  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO message_threads (quote_id, rfq_id, buyer_id, exhibitor_id) VALUES (?, ?, ?, ?)",
    [quoteId, quote.rfq_id, quote.buyer_id, quote.exhibitor_id]
  );
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM message_threads WHERE id = ? LIMIT 1", [result.insertId]);
  return rows[0];
}

export async function getThreadParticipants(quoteId: number) {
  const thread = await getOrCreateThreadForQuote(quoteId);
  if (!thread) return null;
  return { threadId: thread.id, buyerId: thread.buyer_id, exhibitorId: thread.exhibitor_id };
}

export async function listMessages(threadId: number) {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC", [threadId]);
  return rows.map(mapMessageRow);
}

export async function sendMessage(threadId: number, senderId: number, senderName: string, body: string) {
  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO messages (thread_id, sender_id, sender_name, body) VALUES (?, ?, ?, ?)",
    [threadId, senderId, senderName, body]
  );
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM messages WHERE id = ? LIMIT 1", [result.insertId]);
  return mapMessageRow(rows[0]);
}

// Inbox listing: every thread the user is part of (as buyer or exhibitor),
// with the RFQ/quote context and the latest message for a preview.
export async function listThreadsForUser(userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.*, r.title AS rfq_title, q.price AS quote_price,
            r.buyer_name, q.exhibitor_name,
            m.body AS last_message_body, m.created_at AS last_message_at
     FROM message_threads t
     JOIN rfqs r ON r.id = t.rfq_id
     JOIN quotes q ON q.id = t.quote_id
     LEFT JOIN messages m ON m.id = (
       SELECT id FROM messages WHERE thread_id = t.id ORDER BY created_at DESC LIMIT 1
     )
     WHERE t.buyer_id = ? OR t.exhibitor_id = ?
     ORDER BY COALESCE(m.created_at, t.created_at) DESC`,
    [userId, userId]
  );
  return rows.map(mapThreadRow);
}

export async function getThreadForQuoteWithContext(quoteId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.*, r.title AS rfq_title, q.price AS quote_price, r.buyer_name, q.exhibitor_name
     FROM message_threads t
     JOIN rfqs r ON r.id = t.rfq_id
     JOIN quotes q ON q.id = t.quote_id
     WHERE t.quote_id = ? LIMIT 1`,
    [quoteId]
  );
  const row = rows[0];
  return row ? mapThreadRow(row) : null;
}
