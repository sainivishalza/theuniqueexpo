import { randomInt } from "crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import {
  DEFAULT_REFERRAL_SETTINGS,
  REFERRAL_CODE_ALPHABET,
  REFERRAL_CODE_LENGTH,
  isValidReferralCode,
  triggerRank,
  type ReferralSettings,
  type ReferralStatus,
  type ReferralTrigger,
  REFERRAL_TRIGGERS,
} from "@/lib/referral";
import { maskName } from "@/lib/wallet";
import { formatBuyerNumber } from "@/lib/buyer-number";
import { notifyPointsReceived } from "@/lib/server/notifications";
import { bookReferralReward, type ReferralPayout } from "@/lib/server/wallet-repo";

// Referral programme: a buyer invites another buyer with a personal link. What is paid, to whom, when, and how many a
// buyer can be paid for are settings an admin edits (they live in wallet_settings next to the other wallet rules). The
// points themselves are booked by bookReferralReward() in the wallet code, with the same safety as every other balance change.

// ---------- settings ----------

const SETTING_NAMES = ["referral_enabled", "referral_trigger", "referral_referrer_points", "referral_referred_points", "referral_max_per_referrer"];

function count(value: string | undefined, fallback: number, max: number): number {
  const n = Number(value);
  return value !== undefined && /^\d+$/.test(value) && Number.isSafeInteger(n) && n <= max ? n : fallback;
}

export async function getReferralSettings(): Promise<ReferralSettings> {
  const d = DEFAULT_REFERRAL_SETTINGS;
  const [rows] = await pool.query<RowDataPacket[]>("SELECT name, value FROM wallet_settings WHERE name IN (?)", [SETTING_NAMES]);
  const map = new Map(rows.map((r) => [r.name as string, r.value as string]));
  const trigger = map.get("referral_trigger");
  return {
    enabled: map.has("referral_enabled") ? map.get("referral_enabled") === "1" : d.enabled,
    trigger: REFERRAL_TRIGGERS.includes(trigger as ReferralTrigger) ? (trigger as ReferralTrigger) : d.trigger,
    referrerPoints: count(map.get("referral_referrer_points"), d.referrerPoints, 100_000),
    referredPoints: count(map.get("referral_referred_points"), d.referredPoints, 100_000),
    maxPerReferrer: count(map.get("referral_max_per_referrer"), d.maxPerReferrer, 10_000),
  };
}

export async function saveReferralSettings(s: ReferralSettings): Promise<void> {
  const rows: [string, string][] = [
    ["referral_enabled", s.enabled ? "1" : "0"],
    ["referral_trigger", s.trigger],
    ["referral_referrer_points", String(s.referrerPoints)],
    ["referral_referred_points", String(s.referredPoints)],
    ["referral_max_per_referrer", String(s.maxPerReferrer)],
  ];
  await pool.query("INSERT INTO wallet_settings (name, value) VALUES ? ON DUPLICATE KEY UPDATE value = VALUES(value)", [rows]);
}

// ---------- invitation codes ----------

function newCode(): string {
  let code = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) code += REFERRAL_CODE_ALPHABET[randomInt(REFERRAL_CODE_ALPHABET.length)];
  return code;
}

// A buyer's own code; made the first time it is asked for.
export async function getOrCreateCode(userId: number): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT code FROM referral_codes WHERE user_id = ?", [userId]);
    if (rows[0]) return rows[0].code as string;
    await pool.query("INSERT IGNORE INTO referral_codes (user_id, code, created_at) VALUES (?, ?, UTC_TIMESTAMP())", [userId, newCode()]);
  }
  throw new Error("Could not make a referral code");
}

// ---------- recording and paying ----------

// A new buyer signed up through someone's link. Records it (once per new buyer); pays at once when the programme's
// trigger is "signup". Ignores anything that is not valid -- an unknown code, the buyer's own code, a switched-off
// programme -- because a bad invitation must never get in the way of signing up.
export async function recordReferral(referredId: number, code: unknown): Promise<void> {
  if (!isValidReferralCode(code)) return;
  const settings = await getReferralSettings();
  if (!settings.enabled) return;
  const [inviter] = await pool.query<RowDataPacket[]>(
    `SELECT c.user_id FROM referral_codes c JOIN users u ON u.id = c.user_id
     WHERE c.code = ? AND u.role = 'buyer' AND u.status <> 'suspended' AND u.deleted_at IS NULL`,
    [code]
  );
  const referrerId = inviter[0] ? Number(inviter[0].user_id) : 0;
  if (!referrerId || referrerId === referredId) return;
  const [newcomer] = await pool.query<RowDataPacket[]>("SELECT id FROM users WHERE id = ? AND role = 'buyer'", [referredId]);
  if (!newcomer[0]) return;
  const [inserted] = await pool.query<ResultSetHeader>(
    "INSERT IGNORE INTO buyer_referrals (referrer_id, referred_id, created_at) VALUES (?, ?, UTC_TIMESTAMP())",
    [referrerId, referredId]
  );
  if (inserted.affectedRows === 1) await settleReferral(referredId, "signup");
}

function tellBuyers(payout: ReferralPayout): void {
  if (payout.status !== "paid") return;
  // The e-mail has no separate reason line for a referral: the amount and the wallet link say it.
  if (payout.referrerPoints > 0) notifyPointsReceived(payout.referrerId, payout.referrerPoints, "");
  if (payout.referredPoints > 0) notifyPointsReceived(payout.referredId, payout.referredPoints, "");
}

// Something happened to a referred buyer (signed up, a registration was approved, they attended). If it reaches the
// stage the programme pays at, the pending referral is paid. Returns the outcome, or null when nothing was due.
export async function settleReferral(referredId: number, stage: ReferralTrigger): Promise<ReferralPayout | null> {
  const settings = await getReferralSettings();
  if (!settings.enabled || triggerRank(stage) < triggerRank(settings.trigger)) return null;
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM buyer_referrals WHERE referred_id = ? AND status = 'pending'", [referredId]);
  if (!rows[0]) return null;
  const payout = await bookReferralReward(Number(rows[0].id), settings);
  tellBuyers(payout);
  return payout;
}

// For the places that change a registration: a failure here is logged and never fails the registration step itself.
export async function settleReferralQuietly(referredId: number, stage: ReferralTrigger): Promise<void> {
  try {
    await settleReferral(referredId, stage);
  } catch (err) {
    // The tables do not exist until migration 088 has run.
    const code = (err as { code?: string }).code;
    if (code !== "ER_NO_SUCH_TABLE" && code !== "ER_BAD_FIELD_ERROR") console.error("Could not settle the referral of buyer", referredId, err);
  }
}

// How far a buyer has got: attended an exhibition, had a registration approved, or only signed up.
async function stageReached(userId: number): Promise<ReferralTrigger> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT MAX(status = 'attended') AS attended, MAX(status IN ('approved','confirmed','attended')) AS approved
     FROM expo_registrations WHERE user_id = ?`,
    [userId]
  );
  if (Number(rows[0]?.attended)) return "attended";
  if (Number(rows[0]?.approved)) return "approved";
  return "signup";
}

// Pays every waiting referral whose buyer has already reached the stage the programme now pays at -- for after an admin
// changes the rules. Returns how many were paid and how many were held back by the limit.
export async function settlePending(): Promise<{ paid: number; limited: number }> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT referred_id FROM buyer_referrals WHERE status = 'pending' ORDER BY id LIMIT 2000");
  let paid = 0;
  let limited = 0;
  for (const row of rows) {
    const payout = await settleReferral(Number(row.referred_id), await stageReached(Number(row.referred_id)));
    if (payout?.status === "paid") paid += 1;
    else if (payout?.status === "skipped" && payout.reason === "limit_reached") limited += 1;
  }
  return { paid, limited };
}

// An admin turns a pending referral down (a fake account, a duplicate person). Returns false when it is not pending.
export async function rejectReferral(id: number, note: string): Promise<boolean> {
  const [res] = await pool.query<ResultSetHeader>("UPDATE buyer_referrals SET status = 'rejected', note = ? WHERE id = ? AND status = 'pending'", [note.slice(0, 255), id]);
  return res.affectedRows === 1;
}

// ---------- what a buyer sees ----------

export interface MyReferral {
  id: number;
  name: string; // masked
  status: ReferralStatus;
  points: number; // what this buyer earned from it
  createdAt: string;
  rewardedAt: string | null;
}

export interface MyReferralSummary {
  code: string;
  settings: ReferralSettings;
  invited: number;
  rewarded: number;
  earned: number;
  limitReached: boolean;
  items: MyReferral[];
}

function iso(value: unknown): string | null {
  return value ? String(value).replace(" ", "T") + "Z" : null;
}

export async function getMyReferrals(userId: number): Promise<MyReferralSummary> {
  const [code, settings] = await Promise.all([getOrCreateCode(userId), getReferralSettings()]);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT r.id, r.status, r.referrer_points, r.created_at, r.rewarded_at, u.name
     FROM buyer_referrals r JOIN users u ON u.id = r.referred_id
     WHERE r.referrer_id = ? ORDER BY r.id DESC LIMIT 200`,
    [userId]
  );
  const items: MyReferral[] = rows.map((r) => ({
    id: Number(r.id),
    name: maskName(String(r.name)),
    status: r.status as ReferralStatus,
    points: r.status === "rewarded" ? Number(r.referrer_points) : 0,
    createdAt: iso(r.created_at) as string,
    rewardedAt: iso(r.rewarded_at),
  }));
  const rewarded = items.filter((i) => i.status === "rewarded");
  return {
    code,
    settings,
    invited: items.filter((i) => i.status !== "rejected").length,
    rewarded: rewarded.length,
    earned: rewarded.reduce((sum, i) => sum + i.points, 0),
    limitReached: settings.maxPerReferrer > 0 && rewarded.length >= settings.maxPerReferrer,
    items,
  };
}

// ---------- what an admin sees ----------

export interface AdminReferral {
  id: number;
  status: ReferralStatus;
  referrerId: number;
  referrerName: string;
  referrerNumber: string;
  referredId: number;
  referredName: string;
  referredNumber: string;
  referrerPoints: number;
  referredPoints: number;
  note: string;
  createdAt: string;
  rewardedAt: string | null;
}

export interface AdminReferralList {
  items: AdminReferral[];
  hasMore: boolean;
  totals: { pending: number; rewarded: number; rejected: number; pointsPaid: number };
}

export async function listReferrals(filter: { status?: ReferralStatus; q?: string; beforeId?: number }, limit = 50): Promise<AdminReferralList> {
  const where: string[] = [];
  const values: unknown[] = [];
  if (filter.status) {
    where.push("r.status = ?");
    values.push(filter.status);
  }
  const q = (filter.q ?? "").trim().slice(0, 100);
  if (q) {
    where.push("(a.name LIKE ? OR a.email LIKE ? OR b.name LIKE ? OR b.email LIKE ?)");
    const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    values.push(like, like, like, like);
  }
  if (filter.beforeId) {
    where.push("r.id < ?");
    values.push(filter.beforeId);
  }
  const take = Math.min(Math.max(limit, 1), 200);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT r.id, r.status, r.referrer_id, r.referred_id, r.referrer_points, r.referred_points, r.note, r.created_at, r.rewarded_at,
            a.name AS a_name, a.buyer_no AS a_no, b.name AS b_name, b.buyer_no AS b_no
     FROM buyer_referrals r JOIN users a ON a.id = r.referrer_id JOIN users b ON b.id = r.referred_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY r.id DESC LIMIT ?`,
    [...values, take + 1]
  );
  const [totals] = await pool.query<RowDataPacket[]>(
    `SELECT SUM(status = 'pending') AS pending, SUM(status = 'rewarded') AS rewarded, SUM(status = 'rejected') AS rejected,
            COALESCE(SUM(CASE WHEN status = 'rewarded' THEN referrer_points + referred_points ELSE 0 END), 0) AS points_paid
     FROM buyer_referrals`
  );
  return {
    items: rows.slice(0, take).map((r) => ({
      id: Number(r.id),
      status: r.status as ReferralStatus,
      referrerId: Number(r.referrer_id),
      referrerName: String(r.a_name),
      referrerNumber: formatBuyerNumber(r.a_no),
      referredId: Number(r.referred_id),
      referredName: String(r.b_name),
      referredNumber: formatBuyerNumber(r.b_no),
      referrerPoints: Number(r.referrer_points),
      referredPoints: Number(r.referred_points),
      note: String(r.note ?? ""),
      createdAt: iso(r.created_at) as string,
      rewardedAt: iso(r.rewarded_at),
    })),
    hasMore: rows.length > take,
    totals: {
      pending: Number(totals[0]?.pending ?? 0),
      rewarded: Number(totals[0]?.rewarded ?? 0),
      rejected: Number(totals[0]?.rejected ?? 0),
      pointsPaid: Number(totals[0]?.points_paid ?? 0),
    },
  };
}
