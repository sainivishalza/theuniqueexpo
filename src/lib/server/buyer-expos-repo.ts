import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";

// Admin-managed list of expos that buyers are tagged with (Admin -> Buyer
// Expos). A buyer links to an expo by id, so renaming an expo here changes it
// for every buyer at once.

export interface BuyerExpo {
  id: number;
  name: string;
  buyerCount: number;
}

export const MAX_EXPO_NAME_LENGTH = 255;

export class ExpoNameError extends Error {
  constructor(public code: "empty" | "too_long" | "duplicate" | "not_found") {
    super(code);
  }
}

function cleanName(raw: unknown): string {
  const name = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
  if (!name) throw new ExpoNameError("empty");
  if (name.length > MAX_EXPO_NAME_LENGTH) throw new ExpoNameError("too_long");
  return name;
}

function isDuplicateError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "ER_DUP_ENTRY";
}

export async function listBuyerExpos(): Promise<BuyerExpo[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT e.id, e.name, COUNT(bx.user_id) AS buyer_count
     FROM buyer_expos e
     LEFT JOIN buyer_profile_expos bx ON bx.expo_id = e.id
     GROUP BY e.id, e.name
     ORDER BY e.name`
  );
  return rows.map((r) => ({ id: r.id, name: r.name, buyerCount: Number(r.buyer_count) }));
}

export async function createBuyerExpo(rawName: unknown): Promise<BuyerExpo> {
  const name = cleanName(rawName);
  try {
    const [result] = await pool.query<ResultSetHeader>("INSERT INTO buyer_expos (name) VALUES (?)", [name]);
    return { id: result.insertId, name, buyerCount: 0 };
  } catch (err) {
    if (isDuplicateError(err)) throw new ExpoNameError("duplicate");
    throw err;
  }
}

export async function renameBuyerExpo(id: number, rawName: unknown): Promise<void> {
  const name = cleanName(rawName);
  try {
    const [result] = await pool.query<ResultSetHeader>("UPDATE buyer_expos SET name = ? WHERE id = ?", [name, id]);
    if (result.affectedRows === 0) {
      // affectedRows is 0 both for "no such id" and "name unchanged".
      const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM buyer_expos WHERE id = ?", [id]);
      if (rows.length === 0) throw new ExpoNameError("not_found");
    }
  } catch (err) {
    if (isDuplicateError(err)) throw new ExpoNameError("duplicate");
    throw err;
  }
}

// Links to this expo are removed with it (ON DELETE CASCADE); the buyers
// themselves are untouched.
export async function deleteBuyerExpo(id: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>("DELETE FROM buyer_expos WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

// Names -> ids, creating any expo that doesn't exist yet (case-insensitive,
// since the unique key is).
export async function findOrCreateExpoIds(names: string[]): Promise<number[]> {
  const ids: number[] = [];
  const seen = new Set<string>();
  for (const raw of names) {
    const name = raw.replace(/\s+/g, " ").trim().slice(0, MAX_EXPO_NAME_LENGTH);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    await pool.query("INSERT IGNORE INTO buyer_expos (name) VALUES (?)", [name]);
    const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM buyer_expos WHERE name = ? LIMIT 1", [name]);
    if (rows[0]) ids.push(rows[0].id);
  }
  return ids;
}

// Replace a buyer's expos with exactly this set (ids that don't exist are
// ignored).
export async function setBuyerExpoIds(userId: number, expoIds: number[]): Promise<void> {
  const wanted = [...new Set(expoIds.filter((n) => Number.isInteger(n) && n > 0))];
  if (wanted.length === 0) {
    await pool.query("DELETE FROM buyer_profile_expos WHERE user_id = ?", [userId]);
    return;
  }
  const marks = wanted.map(() => "?").join(", ");
  await pool.query(`DELETE FROM buyer_profile_expos WHERE user_id = ? AND expo_id NOT IN (${marks})`, [userId, ...wanted]);
  await pool.query(
    `INSERT IGNORE INTO buyer_profile_expos (user_id, expo_id) SELECT ?, id FROM buyer_expos WHERE id IN (${marks})`,
    [userId, ...wanted]
  );
}

export async function setBuyerExpoNames(userId: number, names: string[]): Promise<void> {
  await setBuyerExpoIds(userId, await findOrCreateExpoIds(names));
}

// Adds expos without touching the ones the buyer already has. Returns how many
// links were actually new.
export async function addBuyerExpoIds(userId: number, expoIds: number[]): Promise<number> {
  const wanted = [...new Set(expoIds.filter((n) => Number.isInteger(n) && n > 0))];
  if (wanted.length === 0) return 0;
  const marks = wanted.map(() => "?").join(", ");
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT IGNORE INTO buyer_profile_expos (user_id, expo_id) SELECT ?, id FROM buyer_expos WHERE id IN (${marks})`,
    [userId, ...wanted]
  );
  return result.affectedRows;
}

// SQL fragments that read a buyer's expos as "A, B" and "1,2" -- used by the
// buyer-profile queries so the old `sourceExhibitions` string (list column,
// search, export) is always built from the live expo names.
export function expoNamesSql(userIdExpr: string): string {
  return `(SELECT GROUP_CONCAT(e.name ORDER BY e.name SEPARATOR ', ') FROM buyer_profile_expos bx JOIN buyer_expos e ON e.id = bx.expo_id WHERE bx.user_id = ${userIdExpr})`;
}

export function expoIdsSql(userIdExpr: string): string {
  return `(SELECT GROUP_CONCAT(bx.expo_id ORDER BY bx.expo_id) FROM buyer_profile_expos bx WHERE bx.user_id = ${userIdExpr})`;
}

export function parseExpoIds(value: unknown): number[] {
  if (typeof value !== "string" || !value) return [];
  return value.split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0);
}
