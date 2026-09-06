import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { safeParseJson } from "@/lib/server/db-helpers";
import { DEFAULT_FAQ_ITEMS, normalizeFaqItems, type FaqItem } from "@/lib/faq-content";

export async function getFaqItems(): Promise<FaqItem[]> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT items FROM faq_content WHERE id = 1 LIMIT 1");
  const row = rows[0];
  if (!row) return DEFAULT_FAQ_ITEMS;
  return normalizeFaqItems(safeParseJson(row.items));
}

export async function updateFaqItems(items: FaqItem[]): Promise<void> {
  await pool.query(
    `INSERT INTO faq_content (id, items) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE items = VALUES(items)`,
    [JSON.stringify(items)]
  );
}
