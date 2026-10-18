import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { formatBuyerNumber } from "@/lib/buyer-number";

// Hands out buyer registration numbers (TUE0001, TUE0002, ...). The number comes
// from one counter row that is locked for the length of a short transaction, so
// two buyers signing up at the same moment can never get the same number, and a
// failed attempt does not burn one (the counter rolls back with it). A number is
// never reused: deleting a buyer leaves a gap.

const COUNTER = "buyer_no";

// Gives this buyer a number if they have none yet. Returns the number, or null for
// a user who is not a buyer.
export async function assignBuyerNumber(userId: number): Promise<number | null> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<RowDataPacket[]>("SELECT role, buyer_no FROM users WHERE id = ? FOR UPDATE", [userId]);
    const user = rows[0];
    if (!user || user.role !== "buyer") {
      await conn.rollback();
      return null;
    }
    if (user.buyer_no) {
      await conn.rollback();
      return Number(user.buyer_no);
    }

    const bump = () => conn.query<ResultSetHeader>("UPDATE id_counters SET last_no = LAST_INSERT_ID(last_no + 1) WHERE name = ?", [COUNTER]);
    let [bumped] = await bump();
    if (bumped.affectedRows === 0) {
      // No counter row yet (a database that has not run the migration's backfill):
      // start it from the highest number already in use.
      await conn.query("INSERT IGNORE INTO id_counters (name, last_no) SELECT ?, COALESCE(MAX(buyer_no), 0) FROM users", [COUNTER]);
      [bumped] = await bump();
    }
    const [[{ no }]] = await conn.query<RowDataPacket[]>("SELECT LAST_INSERT_ID() AS no");
    await conn.query("UPDATE users SET buyer_no = ? WHERE id = ?", [no, userId]);
    await conn.commit();
    return Number(no);
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

// Account creation must never fail because of the number: if it cannot be given
// now, the safety net below (or the next deploy's backfill) gives it later.
export async function assignBuyerNumberQuietly(userId: number): Promise<void> {
  try {
    await assignBuyerNumber(userId);
  } catch (err) {
    console.error("Could not assign a buyer number to user", userId, err);
  }
}

// Safety net for any buyer who has no number (created before the numbers existed,
// or while the database was missing them): numbers them in sign-up order.
export async function assignMissingBuyerNumbers(limit = 500): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM users WHERE role = 'buyer' AND buyer_no IS NULL ORDER BY created_at, id LIMIT ?",
    [limit]
  );
  let assigned = 0;
  for (const row of rows) {
    if (await assignBuyerNumber(row.id)) assigned++;
  }
  return assigned;
}

export async function getBuyerNumber(userId: number): Promise<string> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT buyer_no FROM users WHERE id = ? LIMIT 1", [userId]);
    return formatBuyerNumber(rows[0]?.buyer_no);
  } catch {
    // Before the database has the column: show nothing rather than break the page.
    return "";
  }
}
