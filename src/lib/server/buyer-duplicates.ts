import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { adjustWallet, WalletError } from "@/lib/server/wallet-repo";
import { formatBuyerNumber } from "@/lib/buyer-number";

// Finding buyers who signed up twice (same passport number or same phone number) and merging one account into the other.
//
// A merge MOVES the registrations (tour, event and exhibition), saved exhibitions and website notices, FILLS the gaps in
// the kept profile (including documents) from the other, and moves the points balance (as two ledger entries). It does not
// rewrite history: payments, top-ups, messages and the ledger of the old account stay with it. The old account is then
// suspended and loses the passport and phone number (so signing in by those finds the kept account); what it had is
// written to buyer_merges.

const PASSPORT_SQL = "UPPER(REPLACE(REPLACE(REPLACE(TRIM(p.passport_number), ' ', ''), '-', ''), '.', ''))";
const PHONE_SQL = "REGEXP_REPLACE(p.phone_number, '[^0-9]', '')";
const MIN_PHONE_DIGITS = 7;
const MAX_GROUPS = 100;
// Which registration to keep when both accounts registered for the same exhibition: the one that got further.
const STATUS_RANK: Record<string, number> = { attended: 6, confirmed: 5, absent: 4, approved: 3, pending: 2, rejected: 1, cancelled: 0 };

export interface DuplicateMember {
  id: number;
  buyerNumber: string;
  name: string;
  email: string;
  company: string;
  suspended: boolean;
  createdAt: string;
  registrations: number;
  points: number;
}

export interface DuplicateGroup {
  reason: "passport" | "phone";
  /** The passport number or phone digits they share. */
  value: string;
  members: DuplicateMember[];
}

function isMissing(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  return code === "ER_NO_SUCH_TABLE" || code === "ER_BAD_FIELD_ERROR";
}

async function memberDetails(ids: number[]): Promise<Map<number, DuplicateMember>> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.buyer_no, u.name, u.email, u.status, u.created_at, p.company_name,
            (SELECT COUNT(*) FROM expo_registrations r WHERE r.user_id = u.id) AS regs,
            COALESCE((SELECT w.balance FROM wallets w WHERE w.user_id = u.id), 0) AS points
     FROM users u LEFT JOIN buyer_profiles p ON p.user_id = u.id WHERE u.id IN (?)`,
    [ids]
  );
  return new Map(rows.map((r) => [Number(r.id), {
    id: Number(r.id), buyerNumber: formatBuyerNumber(r.buyer_no), name: String(r.name ?? ""), email: String(r.email ?? ""), company: String(r.company_name ?? ""),
    suspended: r.status === "suspended", createdAt: new Date(r.created_at).toISOString(), registrations: Number(r.regs), points: Number(r.points),
  }]));
}

export async function findDuplicateGroups(): Promise<DuplicateGroup[]> {
  const groups: DuplicateGroup[] = [];
  const queries: { reason: "passport" | "phone"; sql: string }[] = [
    { reason: "passport", sql: `SELECT ${PASSPORT_SQL} AS k, GROUP_CONCAT(u.id ORDER BY u.id) AS ids FROM buyer_profiles p JOIN users u ON u.id = p.user_id WHERE u.role = 'buyer' AND u.status <> 'suspended' AND ${PASSPORT_SQL} <> '' GROUP BY k HAVING COUNT(*) > 1 ORDER BY COUNT(*) DESC, k LIMIT ${MAX_GROUPS}` },
    { reason: "phone", sql: `SELECT ${PHONE_SQL} AS k, GROUP_CONCAT(u.id ORDER BY u.id) AS ids FROM buyer_profiles p JOIN users u ON u.id = p.user_id WHERE u.role = 'buyer' AND u.status <> 'suspended' AND CHAR_LENGTH(${PHONE_SQL}) >= ${MIN_PHONE_DIGITS} GROUP BY k HAVING COUNT(*) > 1 ORDER BY COUNT(*) DESC, k LIMIT ${MAX_GROUPS}` },
  ];
  for (const q of queries) {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(q.sql);
      for (const r of rows) groups.push({ reason: q.reason, value: String(r.k), members: String(r.ids).split(",").map(Number).map((id) => ({ id }) as DuplicateMember) });
    } catch (err) {
      // REGEXP_REPLACE needs MariaDB 10.0.5+ / MySQL 8; without it only the passport check runs.
      if (!isMissing(err) && (err as { code?: string }).code !== "ER_SP_DOES_NOT_EXIST") throw err;
    }
  }
  const all = Array.from(new Set(groups.flatMap((g) => g.members.map((m) => m.id))));
  if (all.length === 0) return [];
  const details = await memberDetails(all);
  return groups.map((g) => ({ ...g, members: g.members.map((m) => details.get(m.id)).filter((m): m is DuplicateMember => !!m) })).filter((g) => g.members.length > 1);
}

export interface MergePreview {
  keep: DuplicateMember;
  merge: DuplicateMember;
  /** Exhibition registrations that move over / that clash with one the kept account already has. */
  registrationsMoving: number;
  registrationsClashing: number;
  tourAndEventRegistrations: number;
  favorites: number;
  points: number;
  /** Money still waiting on the old account (top-ups, withdrawals, expense claims): blocks the merge. */
  pendingMoney: number;
}

async function loadBuyer(conn: Pick<PoolConnection, "query">, id: number): Promise<RowDataPacket | null> {
  const [rows] = await conn.query<RowDataPacket[]>("SELECT id, role, status FROM users WHERE id = ?", [id]);
  return rows[0] && rows[0].role === "buyer" ? rows[0] : null;
}

async function pendingMoney(id: number): Promise<number> {
  let total = 0;
  for (const sql of [
    "SELECT COUNT(*) AS n FROM wallet_topups WHERE user_id = ? AND status = 'pending'",
    "SELECT COUNT(*) AS n FROM wallet_withdrawals WHERE user_id = ? AND status = 'pending'",
    "SELECT COUNT(*) AS n FROM wallet_expense_claims WHERE user_id = ? AND status = 'pending'",
  ]) {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(sql, [id]);
      total += Number(rows[0]?.n ?? 0);
    } catch (err) {
      if (!isMissing(err)) throw err;
    }
  }
  return total;
}

export async function previewMerge(keepId: number, mergeId: number): Promise<MergePreview | "invalid"> {
  if (keepId === mergeId || !(await loadBuyer(pool, keepId)) || !(await loadBuyer(pool, mergeId))) return "invalid";
  const details = await memberDetails([keepId, mergeId]);
  const keep = details.get(keepId), merge = details.get(mergeId);
  if (!keep || !merge) return "invalid";
  const [clash] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM expo_registrations a JOIN expo_registrations b ON b.exhibition_id = a.exhibition_id AND b.user_id = ? WHERE a.user_id = ?",
    [keepId, mergeId]
  );
  const [tourEvent] = await pool.query<RowDataPacket[]>("SELECT (SELECT COUNT(*) FROM tour_registrations WHERE user_id = ?) + (SELECT COUNT(*) FROM event_registrations WHERE user_id = ?) AS n", [mergeId, mergeId]);
  const [favs] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM exhibition_favorites WHERE user_id = ?", [mergeId]);
  const clashing = Number(clash[0]?.n ?? 0);
  return {
    keep, merge,
    registrationsMoving: merge.registrations - clashing,
    registrationsClashing: clashing,
    tourAndEventRegistrations: Number(tourEvent[0]?.n ?? 0),
    favorites: Number(favs[0]?.n ?? 0),
    points: merge.points,
    pendingMoney: await pendingMoney(mergeId),
  };
}

export type MergeResult = { ok: true; summary: Record<string, unknown> } | { ok: false; code: "invalid" | "pending_money" | "wallet_frozen" | "already_merged" | "failed" };

// Profile columns that are not copied across.
const SKIP_PROFILE_COLUMNS = new Set(["id", "user_id", "created_at", "updated_at", "registration_code"]);

export async function mergeBuyers(admin: { id: number; name: string }, keepId: number, mergeId: number): Promise<MergeResult> {
  if (keepId === mergeId || !(await loadBuyer(pool, keepId)) || !(await loadBuyer(pool, mergeId))) return { ok: false, code: "invalid" };
  try {
    const [done] = await pool.query<RowDataPacket[]>("SELECT 1 FROM buyer_merges WHERE merged_id = ? OR merged_id = ? LIMIT 1", [mergeId, keepId]);
    if (done[0]) return { ok: false, code: "already_merged" };
  } catch (err) {
    if (!isMissing(err)) throw err;
    return { ok: false, code: "failed" };
  }
  if ((await pendingMoney(mergeId)) > 0) return { ok: false, code: "pending_money" };

  // Points first: out of the old account, into the kept one, as two ledger entries with reasons. The keys make a retry harmless.
  const [w] = await pool.query<RowDataPacket[]>("SELECT balance, frozen FROM wallets WHERE user_id = ?", [mergeId]);
  const balance = Number(w[0]?.balance ?? 0);
  if (w[0]?.frozen) return { ok: false, code: "wallet_frozen" };
  if (balance > 0) {
    try {
      await adjustWallet(admin.id, mergeId, -balance, `Merged into ${(await memberDetails([keepId])).get(keepId)?.buyerNumber || `account ${keepId}`}`, `merge-${mergeId}-out`);
      await adjustWallet(admin.id, keepId, balance, `Merged from account ${mergeId}`, `merge-${mergeId}-in`);
    } catch (err) {
      if (err instanceof WalletError) return { ok: false, code: err.code === "frozen" ? "wallet_frozen" : "failed" };
      throw err;
    }
  }

  const conn = await pool.getConnection();
  const summary: Record<string, unknown> = { points: balance };
  try {
    await conn.beginTransaction();
    // Exhibition registrations: move them; where both registered for the same exhibition keep the one that got further.
    const [mine] = await conn.query<RowDataPacket[]>("SELECT id, exhibition_id, status FROM expo_registrations WHERE user_id = ?", [mergeId]);
    const [theirs] = await conn.query<RowDataPacket[]>("SELECT id, exhibition_id, status FROM expo_registrations WHERE user_id = ?", [keepId]);
    const keptBy = new Map(theirs.map((r) => [Number(r.exhibition_id), r]));
    let moved = 0, replaced = 0, dropped = 0;
    for (const reg of mine) {
      const clash = keptBy.get(Number(reg.exhibition_id));
      if (!clash) {
        await conn.query("UPDATE expo_registrations SET user_id = ? WHERE id = ?", [keepId, reg.id]);
        moved += 1;
      } else if ((STATUS_RANK[String(reg.status)] ?? 0) > (STATUS_RANK[String(clash.status)] ?? 0)) {
        await conn.query("DELETE FROM expo_registrations WHERE id = ?", [clash.id]);
        await conn.query("UPDATE expo_registrations SET user_id = ? WHERE id = ?", [keepId, reg.id]);
        replaced += 1;
      } else {
        await conn.query("DELETE FROM expo_registrations WHERE id = ?", [reg.id]);
        dropped += 1;
      }
    }
    summary.registrations = { moved, replaced, dropped };
    for (const [table, key] of [["tour_registrations", "tour_id"], ["event_registrations", "event_id"]] as const) {
      const [r1] = await conn.query<import("mysql2/promise").ResultSetHeader>(`UPDATE IGNORE ${table} SET user_id = ? WHERE user_id = ?`, [keepId, mergeId]);
      await conn.query(`DELETE FROM ${table} WHERE user_id = ?`, [mergeId]);
      summary[table] = r1.affectedRows;
      void key;
    }
    const [f] = await conn.query<import("mysql2/promise").ResultSetHeader>("UPDATE IGNORE exhibition_favorites SET user_id = ? WHERE user_id = ?", [keepId, mergeId]);
    await conn.query("DELETE FROM exhibition_favorites WHERE user_id = ?", [mergeId]);
    summary.favorites = f.affectedRows;
    const [n] = await conn.query<import("mysql2/promise").ResultSetHeader>("UPDATE user_notifications SET user_id = ? WHERE user_id = ?", [keepId, mergeId]);
    summary.notifications = n.affectedRows;
    try { await conn.query("INSERT IGNORE INTO buyer_profile_expos (user_id, expo_id) SELECT ?, expo_id FROM buyer_profile_expos WHERE user_id = ?", [keepId, mergeId]); } catch (err) { if (!isMissing(err)) throw err; }

    // The profile: fill what the kept one is missing (documents come with their review status), then take the old one's identifiers away.
    const [pk] = await conn.query<RowDataPacket[]>("SELECT * FROM buyer_profiles WHERE user_id = ? FOR UPDATE", [keepId]);
    const [pm] = await conn.query<RowDataPacket[]>("SELECT * FROM buyer_profiles WHERE user_id = ? FOR UPDATE", [mergeId]);
    const identifiers: Record<string, string> = {};
    if (pm[0]) {
      const old = pm[0];
      identifiers.passport_number = String(old.passport_number ?? "");
      identifiers.phone_number = String(old.phone_number ?? "");
      const filled: string[] = [];
      if (!pk[0]) {
        await conn.query("INSERT INTO buyer_profiles (user_id) VALUES (?)", [keepId]);
      }
      const base = pk[0] ?? {};
      const isEmpty = (v: unknown) => v === null || v === undefined || v === "";
      const sets: string[] = [];
      const values: unknown[] = [];
      for (const col of Object.keys(old)) {
        if (SKIP_PROFILE_COLUMNS.has(col)) continue;
        // Document status / note / flag columns travel with their document, never alone.
        const docBase = /^doc_(.+?)(_status|_note)$/.exec(col)?.[1] ?? /^has_doc_(.+)$/.exec(col)?.[1];
        if (docBase) continue;
        if (isEmpty(base[col]) && !isEmpty(old[col])) {
          sets.push(`\`${col}\` = ?`);
          values.push(old[col]);
          filled.push(col);
          if (/^doc_/.test(col)) {
            for (const extra of [`${col}_status`, `${col}_note`, `has_${col}`]) {
              if (extra in old) { sets.push(`\`${extra}\` = ?`); values.push(old[extra]); }
            }
          }
        }
      }
      if (sets.length > 0) await conn.query(`UPDATE buyer_profiles SET ${sets.join(", ")} WHERE user_id = ?`, [...values, keepId]);
      summary.profileFilled = filled;
      await conn.query("UPDATE buyer_profiles SET passport_number = '', phone_number = '' WHERE user_id = ?", [mergeId]);
    }
    await conn.query("UPDATE users SET status = 'suspended' WHERE id = ?", [mergeId]);
    await conn.query("INSERT INTO buyer_merges (kept_id, merged_id, admin_id, admin_name, details_json) VALUES (?, ?, ?, ?, ?)", [
      keepId, mergeId, admin.id, admin.name.slice(0, 255), JSON.stringify({ ...summary, identifiers }),
    ]);
    try {
      await conn.query("INSERT INTO admin_notes (subject_type, subject_id, admin_id, admin_name, body) VALUES ('buyer', ?, ?, ?, ?)", [
        keepId, admin.id, admin.name.slice(0, 255), `Merged account ${mergeId} into this one (passport and phone moved here; its points: ${balance}).`,
      ]);
    } catch (err) { if (!isMissing(err)) throw err; }
    await conn.commit();
    return { ok: true, summary: { ...summary, identifiers } };
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error("Buyer merge failed:", err);
    return { ok: false, code: "failed" };
  } finally {
    conn.release();
  }
}
