import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

export async function addNewsletterSubscriber(email: string, locale: string) {
  await pool.query(
    "INSERT INTO newsletter_subscribers (email, locale) VALUES (?, ?) ON DUPLICATE KEY UPDATE email = email",
    [email, locale]
  );
}

export async function listNewsletterSubscribers() {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, email, locale, created_at FROM newsletter_subscribers ORDER BY created_at DESC, id DESC"
  );
  return rows.map((r) => ({ id: String(r.id), email: r.email as string, locale: r.locale as string, createdAt: r.created_at }));
}
