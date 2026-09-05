import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";
import { toDateOnlyString } from "@/lib/server/db-helpers";

function mapRfqRow(row: RowDataPacket) {
  return {
    id: String(row.id),
    title: row.title,
    product: row.product,
    description: row.description,
    quantity: row.quantity,
    targetPrice: row.target_price,
    deadline: toDateOnlyString(row.deadline),
    category: row.category,
    buyerId: row.buyer_id ? String(row.buyer_id) : "",
    buyerName: row.buyer_name,
    status: row.status,
    createdAt: toDateOnlyString(row.created_at),
  };
}

function mapQuoteRow(row: RowDataPacket) {
  return {
    id: String(row.id),
    rfqId: String(row.rfq_id),
    exhibitorId: row.exhibitor_id ? String(row.exhibitor_id) : "",
    exhibitorName: row.exhibitor_name,
    price: row.price,
    leadTime: row.lead_time,
    notes: row.notes,
    status: row.status,
    createdAt: toDateOnlyString(row.created_at),
  };
}

export async function listRfqs() {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM rfqs ORDER BY created_at DESC");
  return rows.map(mapRfqRow);
}

export async function getRfqById(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM rfqs WHERE id = ? LIMIT 1", [id]);
  const row = rows[0];
  return row ? mapRfqRow(row) : null;
}

export async function listQuotesForRfq(rfqId: number) {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM quotes WHERE rfq_id = ? ORDER BY created_at ASC", [rfqId]);
  return rows.map(mapQuoteRow);
}

export async function listQuotesGroupedByRfq() {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM quotes ORDER BY created_at ASC");
  const grouped = new Map<string, ReturnType<typeof mapQuoteRow>[]>();
  for (const row of rows) {
    const quote = mapQuoteRow(row);
    if (!grouped.has(quote.rfqId)) grouped.set(quote.rfqId, []);
    grouped.get(quote.rfqId)!.push(quote);
  }
  return grouped;
}

export async function updateRfqStatus(id: number, status: string) {
  await pool.query("UPDATE rfqs SET status = ? WHERE id = ?", [status, id]);
}

export async function deleteRfq(id: number) {
  await pool.query("DELETE FROM rfqs WHERE id = ?", [id]);
}

export async function createRfq(input: {
  title: string; product: string; description: string; quantity: string;
  targetPrice: string; deadline: string; category: string; buyerId?: number; buyerName: string;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO rfqs (title, product, description, quantity, target_price, deadline, category, buyer_id, buyer_name, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
    [input.title, input.product, input.description, input.quantity, input.targetPrice, input.deadline || null, input.category, input.buyerId || null, input.buyerName]
  );
  return result.insertId;
}

export async function createQuote(input: {
  rfqId: number; exhibitorId?: number; exhibitorName: string; price: string; leadTime: string; notes: string;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO quotes (rfq_id, exhibitor_id, exhibitor_name, price, lead_time, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, 'submitted')`,
    [input.rfqId, input.exhibitorId || null, input.exhibitorName, input.price, input.leadTime, input.notes]
  );
  // A quote just came in -- surface that on the RFQ itself so buyers (and
  // admin) see "quotes received" instead of a request that still looks
  // untouched. Only advances a still-open request; doesn't override
  // awarded/closed/draft.
  await pool.query("UPDATE rfqs SET status = 'quotes_received' WHERE id = ? AND status = 'open'", [input.rfqId]);
  return result.insertId;
}

export async function updateQuoteStatus(id: number, status: string) {
  await pool.query("UPDATE quotes SET status = ? WHERE id = ?", [status, id]);
}

export async function deleteQuote(id: number) {
  await pool.query("DELETE FROM quotes WHERE id = ?", [id]);
}
