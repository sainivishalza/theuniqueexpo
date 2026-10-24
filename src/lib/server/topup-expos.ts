import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

export interface TopupExpoOptions {
  website: { id: number; name: string; startDate: string }[];
  other: { name: string }[];
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// The names an admin can pick as the reason of a top-up: the exhibitions on the website (the ones still to come first),
// then the expos kept in Admin -> Buyer Expos that are not on the website. Nothing is listed twice.
export async function listTopupExpos(): Promise<TopupExpoOptions> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, title, start_date FROM exhibitions ORDER BY end_date < UTC_DATE(), start_date, id LIMIT 500"
  );
  const website = rows.map((r) => ({ id: Number(r.id), name: String(r.title), startDate: String(r.start_date).slice(0, 10) }));
  let others: RowDataPacket[] = [];
  try {
    [others] = await pool.query<RowDataPacket[]>("SELECT name FROM buyer_expos ORDER BY name LIMIT 1000");
  } catch (err) {
    // Before migration 051 there is no expos list: only the website's exhibitions are offered.
    if ((err as { code?: string }).code !== "ER_NO_SUCH_TABLE") throw err;
  }
  const other = others.map((r) => ({ name: String(r.name) })).filter((o) => !website.some((w) => sameName(w.name, o.name)));
  return { website, other };
}
