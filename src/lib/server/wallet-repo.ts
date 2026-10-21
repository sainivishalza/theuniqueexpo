import { randomBytes } from "crypto";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import {
  DEFAULT_WALLET_SETTINGS,
  MAX_POINTS,
  maskAccount,
  maskName,
  parsePoints,
  parseSignedPoints,
  type WalletErrorCode,
  type WalletTxType,
  type WithdrawalInput,
} from "@/lib/wallet";
import { formatBuyerNumber } from "@/lib/buyer-number";
import { attendanceRewardFor } from "@/lib/server/wallet-tiers";

// Rewards wallet. 1 point = 1 RMB, whole points only.
//
// How money safety works here -- read this before changing anything:
//   * Every change of a balance happens inside ONE database transaction that first
//     locks the wallet row(s) (SELECT ... FOR UPDATE). Two requests for the same
//     wallet therefore run one after the other, never side by side, so a balance
//     can't be spent twice. When two wallets are involved (a transfer) they are
//     always locked in ascending user id, so two opposite transfers can't deadlock.
//   * A balance only changes through postEntry(): it moves the balance and writes
//     the ledger row in the same transaction, and refuses to go below zero.
//   * Every ledger row carries an idempotency key unique per wallet. Booking the
//     same event twice (a retried request, a double click, an admin pressing
//     Approve twice) finds the first booking and returns it instead of paying again.
//   * Requests that start something a person later reviews (top-up, withdrawal,
//     expense claim, purchase) also carry a client_key, with the same effect.
//   * Reads inside a transaction come AFTER the locks, so they see the latest data.

export class WalletError extends Error {
  constructor(public code: WalletErrorCode, public status = 400) {
    super(code);
  }
}

// ---------- plumbing ----------

function isRetryable(err: unknown): boolean {
  const code = typeof err === "object" && err !== null ? (err as { code?: unknown }).code : undefined;
  return code === "ER_LOCK_DEADLOCK" || code === "ER_LOCK_WAIT_TIMEOUT";
}

// Runs fn in a transaction; commits if it returns, rolls back if it throws. A
// deadlock or lock timeout (rare, and the database's own way of saying "try again")
// is retried a few times -- safe because nothing was committed.
async function withTx<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const result = await fn(conn);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback().catch(() => {});
      if (attempt < 3 && isRetryable(err)) continue;
      throw err;
    } finally {
      conn.release();
    }
  }
}

// "2026-10-18 12:00:00" (UTC, as stored) -> "2026-10-18T12:00:00Z"
function iso(value: unknown): string | null {
  return value ? String(value).replace(" ", "T") + "Z" : null;
}

function newWalletCode(): string {
  return randomBytes(18).toString("base64url"); // 24 characters, 144 bits
}

// Gives a buyer a wallet if they have none. Done on its own (outside the money
// transaction) so it holds no locks. Does nothing for anyone who is not a buyer.
export async function ensureWallet(userId: number): Promise<void> {
  await pool.query(
    `INSERT IGNORE INTO wallets (user_id, wallet_code, balance, frozen, created_at)
     SELECT id, ?, 0, 0, UTC_TIMESTAMP() FROM users WHERE id = ? AND role = 'buyer'`,
    [newWalletCode(), userId]
  );
}

interface LockedWallet {
  userId: number;
  balance: number;
  frozen: boolean;
}

// Locks the wallets in ascending user id (the rule that prevents deadlocks).
async function lockWallets(conn: PoolConnection, userIds: number[]): Promise<Map<number, LockedWallet>> {
  const locked = new Map<number, LockedWallet>();
  for (const id of Array.from(new Set(userIds)).sort((a, b) => a - b)) {
    const [rows] = await conn.query<RowDataPacket[]>("SELECT user_id, balance, frozen FROM wallets WHERE user_id = ? FOR UPDATE", [id]);
    if (!rows[0]) throw new WalletError("not_found", 404);
    locked.set(id, { userId: id, balance: Number(rows[0].balance), frozen: !!rows[0].frozen });
  }
  return locked;
}

// For anything a buyer does themselves: they must be an active buyer right now.
// (A shared lock on the user row, so an admin suspending them waits for us or we
// see the suspension.)
async function assertActiveBuyers(conn: PoolConnection, userIds: number[], missing: WalletErrorCode = "not_buyer"): Promise<void> {
  const ids = Array.from(new Set(userIds)).sort((a, b) => a - b);
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT id, role, status FROM users WHERE id IN (${ids.map(() => "?").join(",")}) ORDER BY id LOCK IN SHARE MODE`,
    ids
  );
  for (const id of ids) {
    const row = rows.find((r) => r.id === id);
    if (!row || row.role !== "buyer" || row.status === "suspended") throw new WalletError(missing, missing === "not_buyer" ? 403 : 404);
  }
}

interface Entry {
  userId: number;
  amount: number; // signed
  type: WalletTxType;
  idemKey: string;
  refType?: string;
  refId?: number;
  counterparty?: number;
  note?: string;
  createdBy?: number;
}

interface PostedEntry {
  id: number;
  amount: number;
  balanceAfter: number;
}

// The only place a balance changes. The wallet must already be locked by the caller.
async function postEntry(conn: PoolConnection, e: Entry): Promise<PostedEntry> {
  if (!Number.isSafeInteger(e.amount) || e.amount === 0 || Math.abs(e.amount) > MAX_POINTS) throw new WalletError("invalid_amount");
  const [upd] = await conn.query<ResultSetHeader>(
    "UPDATE wallets SET balance = balance + ? WHERE user_id = ? AND balance + ? >= 0",
    [e.amount, e.userId, e.amount]
  );
  if (upd.affectedRows !== 1) throw new WalletError("insufficient_funds", 409);
  const [[{ balance }]] = await conn.query<RowDataPacket[]>("SELECT balance FROM wallets WHERE user_id = ?", [e.userId]);
  const [ins] = await conn.query<ResultSetHeader>(
    `INSERT INTO wallet_transactions
       (user_id, amount, balance_after, type, ref_type, ref_id, counterparty_user_id, note, idem_key, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [e.userId, e.amount, balance, e.type, e.refType ?? null, e.refId ?? null, e.counterparty ?? null, (e.note ?? "").slice(0, 255), e.idemKey, e.createdBy ?? null]
  );
  return { id: ins.insertId, amount: e.amount, balanceAfter: Number(balance) };
}

async function findEntry(conn: PoolConnection, userId: number, idemKey: string): Promise<(PostedEntry & { counterparty: number | null }) | null> {
  const [rows] = await conn.query<RowDataPacket[]>(
    "SELECT id, amount, balance_after, counterparty_user_id FROM wallet_transactions WHERE user_id = ? AND idem_key = ?",
    [userId, idemKey]
  );
  const r = rows[0];
  return r ? { id: r.id, amount: Number(r.amount), balanceAfter: Number(r.balance_after), counterparty: r.counterparty_user_id } : null;
}

// ---------- settings ----------

export interface WalletSettings {
  transferMax: number;
  transferDailyMax: number;
  withdrawMin: number;
  transfersEnabled: boolean;
  withdrawalsEnabled: boolean;
}

export interface WalletTextSettings {
  topupInstructions: string;
  companyAlipayQr: string;
  companyWechatQr: string;
  companyBankDetails: string;
}

async function readSettingRows(conn?: PoolConnection): Promise<Map<string, string>> {
  const [rows] = await (conn ?? pool).query<RowDataPacket[]>("SELECT name, value FROM wallet_settings");
  return new Map(rows.map((r) => [r.name as string, r.value as string]));
}

function intSetting(map: Map<string, string>, name: string, fallback: number): number {
  const n = Number(map.get(name));
  return map.has(name) && Number.isSafeInteger(n) && n >= 1 && n <= MAX_POINTS ? n : fallback;
}

function flagSetting(map: Map<string, string>, name: string, fallback: boolean): boolean {
  const v = map.get(name);
  return v === undefined ? fallback : v === "1";
}

function toSettings(map: Map<string, string>): WalletSettings {
  const d = DEFAULT_WALLET_SETTINGS;
  return {
    transferMax: intSetting(map, "transfer_max", d.transferMax),
    transferDailyMax: intSetting(map, "transfer_daily_max", d.transferDailyMax),
    withdrawMin: intSetting(map, "withdraw_min", d.withdrawMin),
    transfersEnabled: flagSetting(map, "transfers_enabled", d.transfersEnabled),
    withdrawalsEnabled: flagSetting(map, "withdrawals_enabled", d.withdrawalsEnabled),
  };
}

export async function getWalletSettings(conn?: PoolConnection): Promise<WalletSettings> {
  return toSettings(await readSettingRows(conn));
}

export async function getWalletTextSettings(): Promise<WalletTextSettings> {
  const map = await readSettingRows();
  return {
    topupInstructions: map.get("topup_instructions") ?? "",
    companyAlipayQr: map.get("company_alipay_qr") ?? "",
    companyWechatQr: map.get("company_wechat_qr") ?? "",
    companyBankDetails: map.get("company_bank_details") ?? "",
  };
}

export async function saveWalletSettings(values: WalletSettings & WalletTextSettings): Promise<void> {
  const rows: [string, string][] = [
    ["transfer_max", String(values.transferMax)],
    ["transfer_daily_max", String(values.transferDailyMax)],
    ["withdraw_min", String(values.withdrawMin)],
    ["transfers_enabled", values.transfersEnabled ? "1" : "0"],
    ["withdrawals_enabled", values.withdrawalsEnabled ? "1" : "0"],
    ["topup_instructions", values.topupInstructions],
    ["company_alipay_qr", values.companyAlipayQr],
    ["company_wechat_qr", values.companyWechatQr],
    ["company_bank_details", values.companyBankDetails],
  ];
  await withTx(async (conn) => {
    for (const [name, value] of rows) {
      await conn.query("INSERT INTO wallet_settings (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", [name, value]);
    }
  });
}

// ---------- reading a wallet ----------

export interface WalletSummary {
  balance: number;
  walletCode: string;
  frozen: boolean;
  buyerNumber: string;
  name: string;
  pendingWithdrawal: number;
  settings: WalletSettings;
}

export async function getWalletSummary(userId: number): Promise<WalletSummary | null> {
  await ensureWallet(userId);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT w.balance, w.wallet_code, w.frozen, u.buyer_no, u.name,
            (SELECT COALESCE(SUM(points), 0) FROM wallet_withdrawals WHERE user_id = w.user_id AND status = 'pending') AS pending_withdrawal
     FROM wallets w JOIN users u ON u.id = w.user_id WHERE w.user_id = ?`,
    [userId]
  );
  const r = rows[0];
  if (!r) return null;
  return {
    balance: Number(r.balance),
    walletCode: r.wallet_code,
    frozen: !!r.frozen,
    buyerNumber: formatBuyerNumber(r.buyer_no),
    name: r.name,
    pendingWithdrawal: Number(r.pending_withdrawal),
    settings: await getWalletSettings(),
  };
}

export interface MyTransaction {
  id: number;
  amount: number;
  balanceAfter: number;
  type: WalletTxType;
  note: string;
  refType: string | null;
  refId: number | null;
  counterpartyName: string;
  counterpartyNumber: string;
  createdAt: string;
}

export async function listMyTransactions(userId: number, beforeId?: number, limit = 30): Promise<{ items: MyTransaction[]; hasMore: boolean }> {
  const take = Math.min(Math.max(limit, 1), 100);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.id, t.amount, t.balance_after, t.type, t.note, t.ref_type, t.ref_id, t.created_at, c.name AS c_name, c.buyer_no AS c_no
     FROM wallet_transactions t LEFT JOIN users c ON c.id = t.counterparty_user_id
     WHERE t.user_id = ? ${beforeId ? "AND t.id < ?" : ""}
     ORDER BY t.id DESC LIMIT ?`,
    beforeId ? [userId, beforeId, take + 1] : [userId, take + 1]
  );
  const items = rows.slice(0, take).map((r) => ({
    id: Number(r.id),
    amount: Number(r.amount),
    balanceAfter: Number(r.balance_after),
    type: r.type as WalletTxType,
    note: r.note as string,
    refType: r.ref_type as string | null,
    refId: r.ref_id as number | null,
    counterpartyName: r.c_name ? maskName(r.c_name) : "",
    counterpartyNumber: formatBuyerNumber(r.c_no),
    createdAt: iso(r.created_at) as string,
  }));
  return { items, hasMore: rows.length > take };
}

// ---------- finding the person to pay ----------

export interface Recipient {
  userId: number;
  name: string; // masked
  buyerNumber: string;
}

// "to" is what the sender scanned or typed: a wallet code from a QR code, or a buyer
// number such as TUE0042.
export async function findRecipient(to: { code?: string; buyerNo?: number }): Promise<Recipient | null> {
  let rows: RowDataPacket[] = [];
  if (to.code) {
    if (!/^[A-Za-z0-9_-]{24}$/.test(to.code)) return null;
    [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.name, u.buyer_no FROM wallets w JOIN users u ON u.id = w.user_id
       WHERE w.wallet_code = ? AND u.role = 'buyer' AND u.status = 'active'`,
      [to.code]
    );
  } else if (to.buyerNo) {
    [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, name, buyer_no FROM users WHERE buyer_no = ? AND role = 'buyer' AND status = 'active'",
      [to.buyerNo]
    );
  }
  const r = rows[0];
  return r ? { userId: r.id, name: maskName(r.name), buyerNumber: formatBuyerNumber(r.buyer_no) } : null;
}

// ---------- sending points to another buyer ----------

export interface TransferResult {
  transactionId: number;
  balance: number;
  replayed: boolean;
}

export async function transferPoints(input: {
  fromUserId: number;
  to: { code?: string; buyerNo?: number };
  amount: number;
  note: string;
  key: string;
}): Promise<TransferResult> {
  const amount = parsePoints(input.amount);
  if (amount === null) throw new WalletError("invalid_amount");
  const recipient = await findRecipient(input.to);
  if (!recipient) throw new WalletError("recipient_not_found", 404);
  if (recipient.userId === input.fromUserId) throw new WalletError("self_transfer");
  await ensureWallet(input.fromUserId);
  await ensureWallet(recipient.userId);
  const note = input.note.trim().slice(0, 100);
  const outKey = `send:${input.key}`;

  return withTx(async (conn) => {
    await assertActiveBuyers(conn, [input.fromUserId]);
    await assertActiveBuyers(conn, [recipient.userId], "recipient_not_found");
    const wallets = await lockWallets(conn, [input.fromUserId, recipient.userId]);

    // The same request again: report the first outcome, move nothing.
    const earlier = await findEntry(conn, input.fromUserId, outKey);
    if (earlier) {
      if (earlier.counterparty !== recipient.userId || earlier.amount !== -amount) throw new WalletError("key_conflict", 409);
      return { transactionId: earlier.id, balance: earlier.balanceAfter, replayed: true };
    }

    const settings = await getWalletSettings(conn);
    if (!settings.transfersEnabled) throw new WalletError("transfers_disabled", 403);
    const sender = wallets.get(input.fromUserId)!;
    if (sender.frozen) throw new WalletError("frozen", 403);
    if (amount > settings.transferMax) throw new WalletError("over_limit");
    if (sender.balance < amount) throw new WalletError("insufficient_funds", 409);
    const [[sent]] = await conn.query<RowDataPacket[]>(
      "SELECT COALESCE(SUM(-amount), 0) AS total FROM wallet_transactions WHERE user_id = ? AND type = 'transfer_out' AND created_at > UTC_TIMESTAMP() - INTERVAL 1 DAY",
      [input.fromUserId]
    );
    if (Number(sent.total) + amount > settings.transferDailyMax) throw new WalletError("over_daily_limit");

    const out = await postEntry(conn, {
      userId: input.fromUserId,
      amount: -amount,
      type: "transfer_out",
      idemKey: outKey,
      counterparty: recipient.userId,
      note,
    });
    await postEntry(conn, {
      userId: recipient.userId,
      amount,
      type: "transfer_in",
      idemKey: `recv:${input.fromUserId}:${input.key}`,
      refType: "transfer",
      refId: out.id,
      counterparty: input.fromUserId,
      note,
    });
    return { transactionId: out.id, balance: out.balanceAfter, replayed: false };
  });
}

// ---------- points earned by attending an exhibition ----------

// Called after a registration becomes "attended" (QR check-in or the organiser marking
// it). Safe to call any number of times: a registration pays out once.
export async function awardAttendance(registrationId: number): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT r.user_id, r.exhibition_id, e.title
     FROM expo_registrations r JOIN exhibitions e ON e.id = r.exhibition_id
     WHERE r.id = ? AND r.status = 'attended'`,
    [registrationId]
  );
  const r = rows[0];
  // The rate for this buyer's region (or the exhibition's single rate).
  const points = r ? (await attendanceRewardFor(r.exhibition_id, r.user_id)).points : 0;
  if (!r || points < 1 || points > MAX_POINTS) return 0;
  await ensureWallet(r.user_id);
  return withTx(async (conn) => {
    const [user] = await conn.query<RowDataPacket[]>("SELECT id FROM users WHERE id = ? AND role = 'buyer' LOCK IN SHARE MODE", [r.user_id]);
    if (!user[0]) return 0;
    await lockWallets(conn, [r.user_id]);
    const key = `attend:${registrationId}`;
    if (await findEntry(conn, r.user_id, key)) return 0;
    await postEntry(conn, {
      userId: r.user_id,
      amount: points,
      type: "attendance",
      idemKey: key,
      refType: "exhibition",
      refId: r.exhibition_id,
      note: String(r.title).slice(0, 150),
    });
    return points;
  });
}

// A check-in must never fail because of the reward: if it cannot be paid now, the
// error is logged and an admin can add the points by hand (the reward itself is
// still booked only once).
export async function awardAttendanceQuietly(registrationId: number): Promise<void> {
  try {
    await awardAttendance(registrationId);
  } catch (err) {
    console.error("Could not award attendance points for registration", registrationId, err);
  }
}

// ---------- top-ups ----------

export interface TopupInput {
  points: number;
  reference: string;
  note: string;
  proof: string;
  key: string;
}

export async function createTopup(userId: number, input: TopupInput): Promise<{ id: number; replayed: boolean }> {
  const points = parsePoints(input.points);
  if (points === null) throw new WalletError("invalid_amount");
  await ensureWallet(userId);
  return withTx(async (conn) => {
    await assertActiveBuyers(conn, [userId]);
    await lockWallets(conn, [userId]);
    const [dupe] = await conn.query<RowDataPacket[]>("SELECT id FROM wallet_topups WHERE user_id = ? AND client_key = ?", [userId, input.key]);
    if (dupe[0]) return { id: dupe[0].id, replayed: true };
    const [ins] = await conn.query<ResultSetHeader>(
      `INSERT INTO wallet_topups (user_id, client_key, points, reference, note, proof, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', UTC_TIMESTAMP())`,
      [userId, input.key, points, input.reference.slice(0, 150), input.note.slice(0, 500), input.proof]
    );
    return { id: ins.insertId, replayed: false };
  });
}

export async function cancelTopup(userId: number, id: number): Promise<void> {
  await withTx(async (conn) => {
    await lockWallets(conn, [userId]);
    const [rows] = await conn.query<RowDataPacket[]>("SELECT status FROM wallet_topups WHERE id = ? AND user_id = ? FOR UPDATE", [id, userId]);
    if (!rows[0]) throw new WalletError("not_found", 404);
    if (rows[0].status !== "pending") throw new WalletError("already_processed", 409);
    await conn.query("UPDATE wallet_topups SET status = 'cancelled', reviewed_at = UTC_TIMESTAMP() WHERE id = ?", [id]);
  });
}

async function ownerOf(table: "wallet_topups" | "wallet_withdrawals" | "wallet_expense_claims" | "wallet_purchases", id: number): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT user_id FROM ${table} WHERE id = ?`, [id]);
  if (!rows[0]) throw new WalletError("not_found", 404);
  return rows[0].user_id as number;
}

// Admin: the money arrived. `points` is what to credit (normally what was asked).
export async function approveTopup(adminId: number, id: number, points: number, adminNote: string): Promise<void> {
  const credit = parsePoints(points);
  if (credit === null) throw new WalletError("invalid_amount");
  const userId = await ownerOf("wallet_topups", id);
  await withTx(async (conn) => {
    await lockWallets(conn, [userId]);
    const [rows] = await conn.query<RowDataPacket[]>("SELECT status FROM wallet_topups WHERE id = ? FOR UPDATE", [id]);
    if (rows[0]?.status !== "pending") throw new WalletError("already_processed", 409);
    await postEntry(conn, { userId, amount: credit, type: "topup", idemKey: `topup:${id}`, refType: "topup", refId: id, createdBy: adminId });
    await conn.query(
      "UPDATE wallet_topups SET status = 'approved', approved_points = ?, admin_note = ?, reviewed_by = ?, reviewed_at = UTC_TIMESTAMP() WHERE id = ?",
      [credit, adminNote.slice(0, 500), adminId, id]
    );
  });
}

export async function rejectTopup(adminId: number, id: number, adminNote: string): Promise<void> {
  const userId = await ownerOf("wallet_topups", id);
  await withTx(async (conn) => {
    await lockWallets(conn, [userId]);
    const [rows] = await conn.query<RowDataPacket[]>("SELECT status FROM wallet_topups WHERE id = ? FOR UPDATE", [id]);
    if (rows[0]?.status !== "pending") throw new WalletError("already_processed", 409);
    await conn.query(
      "UPDATE wallet_topups SET status = 'rejected', admin_note = ?, reviewed_by = ?, reviewed_at = UTC_TIMESTAMP() WHERE id = ?",
      [adminNote.slice(0, 500), adminId, id]
    );
  });
}

// ---------- withdrawals ----------

// The points leave the balance the moment the request is made (so they cannot also be
// spent or sent), and come back if the request is cancelled or rejected.
export async function requestWithdrawal(userId: number, input: WithdrawalInput & { key: string }): Promise<{ id: number; balance: number; replayed: boolean }> {
  const points = parsePoints(input.points);
  if (points === null) throw new WalletError("invalid_amount");
  await ensureWallet(userId);
  return withTx(async (conn) => {
    await assertActiveBuyers(conn, [userId]);
    const wallets = await lockWallets(conn, [userId]);
    const wallet = wallets.get(userId)!;

    const [dupe] = await conn.query<RowDataPacket[]>("SELECT id FROM wallet_withdrawals WHERE user_id = ? AND client_key = ?", [userId, input.key]);
    if (dupe[0]) return { id: dupe[0].id, balance: wallet.balance, replayed: true };

    const settings = await getWalletSettings(conn);
    if (!settings.withdrawalsEnabled) throw new WalletError("withdrawals_disabled", 403);
    if (wallet.frozen) throw new WalletError("frozen", 403);
    if (points < settings.withdrawMin) throw new WalletError("below_minimum");
    if (wallet.balance < points) throw new WalletError("insufficient_funds", 409);

    const bank = input.method === "bank";
    const [ins] = await conn.query<ResultSetHeader>(
      `INSERT INTO wallet_withdrawals
         (user_id, client_key, points, method, qr_image, account_name, bank_name, bank_branch, bank_account, note, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', UTC_TIMESTAMP())`,
      [
        userId, input.key, points, input.method,
        bank ? null : input.qrImage,
        input.accountName.trim(),
        bank ? input.bankName.trim() : "",
        bank ? input.bankBranch.trim() : "",
        bank ? input.bankAccount.replace(/\s+/g, " ").trim() : "",
        input.note.slice(0, 500),
      ]
    );
    const posted = await postEntry(conn, {
      userId, amount: -points, type: "withdrawal_hold", idemKey: `wd:${ins.insertId}:hold`, refType: "withdrawal", refId: ins.insertId,
    });
    return { id: ins.insertId, balance: posted.balanceAfter, replayed: false };
  });
}

// Gives the held points back. The caller has locked the wallet and the withdrawal row
// and checked that it is still pending.
async function refundWithdrawal(conn: PoolConnection, id: number, userId: number, points: number, createdBy?: number) {
  await postEntry(conn, { userId, amount: points, type: "withdrawal_refund", idemKey: `wd:${id}:refund`, refType: "withdrawal", refId: id, createdBy });
}

export async function cancelWithdrawal(userId: number, id: number): Promise<void> {
  await withTx(async (conn) => {
    await lockWallets(conn, [userId]);
    const [rows] = await conn.query<RowDataPacket[]>("SELECT status, points FROM wallet_withdrawals WHERE id = ? AND user_id = ? FOR UPDATE", [id, userId]);
    if (!rows[0]) throw new WalletError("not_found", 404);
    if (rows[0].status !== "pending") throw new WalletError("already_processed", 409);
    await conn.query("UPDATE wallet_withdrawals SET status = 'cancelled', processed_at = UTC_TIMESTAMP() WHERE id = ?", [id]);
    await refundWithdrawal(conn, id, userId, Number(rows[0].points));
  });
}

// Admin: the money has been sent to the buyer.
export async function markWithdrawalPaid(adminId: number, id: number, payoutReference: string, adminNote: string): Promise<void> {
  const userId = await ownerOf("wallet_withdrawals", id);
  await withTx(async (conn) => {
    await lockWallets(conn, [userId]);
    const [rows] = await conn.query<RowDataPacket[]>("SELECT status FROM wallet_withdrawals WHERE id = ? FOR UPDATE", [id]);
    if (rows[0]?.status !== "pending") throw new WalletError("already_processed", 409);
    await conn.query(
      "UPDATE wallet_withdrawals SET status = 'paid', payout_reference = ?, admin_note = ?, processed_by = ?, processed_at = UTC_TIMESTAMP() WHERE id = ?",
      [payoutReference.slice(0, 150), adminNote.slice(0, 500), adminId, id]
    );
  });
}

// Admin: refuse the withdrawal; the points go back to the buyer.
export async function rejectWithdrawal(adminId: number, id: number, adminNote: string): Promise<void> {
  const userId = await ownerOf("wallet_withdrawals", id);
  await withTx(async (conn) => {
    await lockWallets(conn, [userId]);
    const [rows] = await conn.query<RowDataPacket[]>("SELECT status, points FROM wallet_withdrawals WHERE id = ? FOR UPDATE", [id]);
    if (rows[0]?.status !== "pending") throw new WalletError("already_processed", 409);
    await conn.query(
      "UPDATE wallet_withdrawals SET status = 'rejected', admin_note = ?, processed_by = ?, processed_at = UTC_TIMESTAMP() WHERE id = ?",
      [adminNote.slice(0, 500), adminId, id]
    );
    await refundWithdrawal(conn, id, userId, Number(rows[0].points), adminId);
  });
}

// ---------- travel expense claims ----------

export interface ExpenseInput {
  exhibitionId: number | null;
  category: string;
  title: string;
  expenseDate: string | null;
  amountText: string;
  note: string;
  receipts: string[];
  key: string;
}

export async function createExpenseClaim(userId: number, input: ExpenseInput): Promise<{ id: number; replayed: boolean }> {
  await ensureWallet(userId);
  return withTx(async (conn) => {
    await assertActiveBuyers(conn, [userId]);
    await lockWallets(conn, [userId]);
    const [dupe] = await conn.query<RowDataPacket[]>("SELECT id FROM wallet_expense_claims WHERE user_id = ? AND client_key = ?", [userId, input.key]);
    if (dupe[0]) return { id: dupe[0].id, replayed: true };
    const [ins] = await conn.query<ResultSetHeader>(
      `INSERT INTO wallet_expense_claims
         (user_id, client_key, exhibition_id, category, title, expense_date, amount_text, note, receipts, receipt_count, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', UTC_TIMESTAMP())`,
      [userId, input.key, input.exhibitionId, input.category, input.title, input.expenseDate, input.amountText, input.note, JSON.stringify(input.receipts), input.receipts.length]
    );
    return { id: ins.insertId, replayed: false };
  });
}

// Admin: approve with the number of points the claim is worth, or reject.
export async function reviewExpenseClaim(adminId: number, id: number, decision: { approve: true; points: number; adminNote: string } | { approve: false; adminNote: string }): Promise<void> {
  const points = decision.approve ? parsePoints(decision.points) : null;
  if (decision.approve && points === null) throw new WalletError("invalid_amount");
  const userId = await ownerOf("wallet_expense_claims", id);
  await withTx(async (conn) => {
    await lockWallets(conn, [userId]);
    const [rows] = await conn.query<RowDataPacket[]>("SELECT status, title FROM wallet_expense_claims WHERE id = ? FOR UPDATE", [id]);
    if (rows[0]?.status !== "pending") throw new WalletError("already_processed", 409);
    if (points !== null) {
      await postEntry(conn, {
        userId, amount: points, type: "expense", idemKey: `expense:${id}`, refType: "expense", refId: id, createdBy: adminId,
        note: String(rows[0].title).slice(0, 150),
      });
    }
    await conn.query(
      "UPDATE wallet_expense_claims SET status = ?, points_awarded = ?, admin_note = ?, reviewed_by = ?, reviewed_at = UTC_TIMESTAMP() WHERE id = ?",
      [points !== null ? "approved" : "rejected", points, decision.adminNote.slice(0, 500), adminId, id]
    );
  });
}

// ---------- buying a package with points ----------

export async function buyTourWithPoints(userId: number, tourId: number, key: string): Promise<{ id: number; balance: number; replayed: boolean }> {
  await ensureWallet(userId);
  return withTx(async (conn) => {
    await assertActiveBuyers(conn, [userId]);
    const wallet = (await lockWallets(conn, [userId])).get(userId)!;

    const [dupe] = await conn.query<RowDataPacket[]>("SELECT id FROM wallet_purchases WHERE user_id = ? AND client_key = ?", [userId, key]);
    if (dupe[0]) return { id: dupe[0].id, balance: wallet.balance, replayed: true };

    if (wallet.frozen) throw new WalletError("frozen", 403);
    const [tours] = await conn.query<RowDataPacket[]>("SELECT title, price_points, end_date FROM tours WHERE id = ?", [tourId]);
    const tour = tours[0];
    if (!tour) throw new WalletError("not_found", 404);
    const price = tour.price_points === null ? 0 : Number(tour.price_points);
    if (price < 1 || price > MAX_POINTS) throw new WalletError("tour_not_for_points");
    const [open] = await conn.query<RowDataPacket[]>("SELECT 1 AS ok FROM tours WHERE id = ? AND end_date >= UTC_DATE()", [tourId]);
    if (!open[0]) throw new WalletError("tour_not_for_points");
    const [owned] = await conn.query<RowDataPacket[]>("SELECT id FROM wallet_purchases WHERE user_id = ? AND tour_id = ? AND status = 'paid'", [userId, tourId]);
    if (owned[0]) throw new WalletError("already_purchased", 409);
    if (wallet.balance < price) throw new WalletError("insufficient_funds", 409);

    const [ins] = await conn.query<ResultSetHeader>(
      "INSERT INTO wallet_purchases (user_id, client_key, tour_id, points, status, created_at) VALUES (?, ?, ?, ?, 'paid', UTC_TIMESTAMP())",
      [userId, key, tourId, price]
    );
    const posted = await postEntry(conn, {
      userId, amount: -price, type: "purchase", idemKey: `purchase:${ins.insertId}`, refType: "tour", refId: tourId, note: String(tour.title).slice(0, 150),
    });
    return { id: ins.insertId, balance: posted.balanceAfter, replayed: false };
  });
}

// Admin: give the points for a purchase back.
export async function refundPurchase(adminId: number, id: number, adminNote: string): Promise<void> {
  const userId = await ownerOf("wallet_purchases", id);
  await withTx(async (conn) => {
    await lockWallets(conn, [userId]);
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT p.status, p.points, p.tour_id, t.title FROM wallet_purchases p LEFT JOIN tours t ON t.id = p.tour_id WHERE p.id = ? FOR UPDATE",
      [id]
    );
    if (rows[0]?.status !== "paid") throw new WalletError("already_processed", 409);
    await postEntry(conn, {
      userId, amount: Number(rows[0].points), type: "purchase_refund", idemKey: `purchase:${id}:refund`, refType: "tour", refId: rows[0].tour_id,
      createdBy: adminId, note: String(rows[0].title ?? "").slice(0, 150),
    });
    await conn.query(
      "UPDATE wallet_purchases SET status = 'refunded', admin_note = ?, refunded_by = ?, refunded_at = UTC_TIMESTAMP() WHERE id = ?",
      [adminNote.slice(0, 500), adminId, id]
    );
  });
}

// ---------- admin: corrections and controls ----------

// Adds or removes points by hand, with a reason that stays in the ledger.
export async function adjustWallet(adminId: number, userId: number, delta: number, note: string, key: string): Promise<{ balance: number; replayed: boolean }> {
  const amount = parseSignedPoints(delta);
  if (amount === null) throw new WalletError("invalid_amount");
  if (note.trim().length < 3) throw new WalletError("invalid_input");
  await ensureWallet(userId);
  return withTx(async (conn) => {
    await lockWallets(conn, [userId]);
    const idem = `adj:${key}`;
    const earlier = await findEntry(conn, userId, idem);
    if (earlier) {
      if (earlier.amount !== amount) throw new WalletError("key_conflict", 409);
      return { balance: earlier.balanceAfter, replayed: true };
    }
    const posted = await postEntry(conn, { userId, amount, type: "adjustment", idemKey: idem, createdBy: adminId, note: note.trim() });
    return { balance: posted.balanceAfter, replayed: false };
  });
}

// The same points for many buyers, each as its own ledger row (so each buyer's statement
// shows it and the reason). Not all-or-nothing: a buyer who cannot be credited is
// reported and the rest go through. The batch key makes a repeated request harmless --
// every buyer's entry is keyed by it, so nobody is credited twice.
export async function bulkAdjustWallets(
  adminId: number,
  userIds: number[],
  amount: number,
  note: string,
  key: string
): Promise<{ added: number; failed: { userId: number; code: string }[] }> {
  const ids = Array.from(new Set(userIds)).sort((a, b) => a - b);
  const failed: { userId: number; code: string }[] = [];
  let added = 0;
  for (const userId of ids) {
    try {
      await adjustWallet(adminId, userId, amount, note, `${key}-${userId}`);
      added += 1;
    } catch (err) {
      failed.push({ userId, code: err instanceof WalletError ? err.code : "server_error" });
    }
  }
  return { added, failed };
}

export async function setWalletFrozen(userId: number, frozen: boolean): Promise<void> {
  await ensureWallet(userId);
  const [res] = await pool.query<ResultSetHeader>("UPDATE wallets SET frozen = ? WHERE user_id = ?", [frozen ? 1 : 0, userId]);
  if (res.affectedRows === 0) throw new WalletError("not_found", 404);
}

export interface Mismatch {
  userId: number;
  balance: number;
  ledgerTotal: number;
  lastBalanceAfter: number | null;
}

// The books must balance: every wallet's balance equals the sum of its ledger rows,
// and equals the balance recorded on its newest row.
export async function findLedgerMismatches(): Promise<Mismatch[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT w.user_id, w.balance, COALESCE(s.total, 0) AS ledger_total, l.balance_after AS last_after
     FROM wallets w
     LEFT JOIN (SELECT user_id, SUM(amount) AS total, MAX(id) AS last_id FROM wallet_transactions GROUP BY user_id) s ON s.user_id = w.user_id
     LEFT JOIN wallet_transactions l ON l.id = s.last_id
     WHERE w.balance <> COALESCE(s.total, 0) OR (l.id IS NOT NULL AND w.balance <> l.balance_after)`
  );
  return rows.map((r) => ({
    userId: r.user_id,
    balance: Number(r.balance),
    ledgerTotal: Number(r.ledger_total),
    lastBalanceAfter: r.last_after === null ? null : Number(r.last_after),
  }));
}

// ---------- the buyer's own lists ----------

export async function listMyTopups(userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, points, approved_points, reference, status, admin_note, created_at, reviewed_at
     FROM wallet_topups WHERE user_id = ? ORDER BY id DESC LIMIT 50`,
    [userId]
  );
  return rows.map((r) => ({
    id: r.id as number,
    points: Number(r.points),
    approvedPoints: r.approved_points === null ? null : Number(r.approved_points),
    reference: r.reference as string,
    status: r.status as string,
    adminNote: r.admin_note as string,
    createdAt: iso(r.created_at) as string,
    reviewedAt: iso(r.reviewed_at),
  }));
}

export async function listMyWithdrawals(userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, points, method, account_name, bank_name, bank_account, (qr_image IS NOT NULL) AS has_qr, status, payout_reference, admin_note, created_at, processed_at
     FROM wallet_withdrawals WHERE user_id = ? ORDER BY id DESC LIMIT 50`,
    [userId]
  );
  return rows.map((r) => ({
    id: r.id as number,
    points: Number(r.points),
    method: r.method as string,
    accountName: r.account_name as string,
    bankName: r.bank_name as string,
    bankAccountMasked: r.bank_account ? maskAccount(r.bank_account) : "",
    status: r.status as string,
    payoutReference: r.payout_reference as string,
    adminNote: r.admin_note as string,
    createdAt: iso(r.created_at) as string,
    processedAt: iso(r.processed_at),
  }));
}

export async function listMyExpenseClaims(userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT c.id, c.category, c.title, c.expense_date, c.amount_text, c.receipt_count, c.status, c.points_awarded, c.admin_note, c.created_at, c.reviewed_at, e.title AS exhibition_title
     FROM wallet_expense_claims c LEFT JOIN exhibitions e ON e.id = c.exhibition_id
     WHERE c.user_id = ? ORDER BY c.id DESC LIMIT 50`,
    [userId]
  );
  return rows.map((r) => ({
    id: r.id as number,
    category: r.category as string,
    title: r.title as string,
    expenseDate: r.expense_date as string | null,
    amountText: r.amount_text as string,
    receiptCount: Number(r.receipt_count),
    status: r.status as string,
    pointsAwarded: r.points_awarded === null ? null : Number(r.points_awarded),
    adminNote: r.admin_note as string,
    exhibitionTitle: (r.exhibition_title as string | null) ?? "",
    createdAt: iso(r.created_at) as string,
    reviewedAt: iso(r.reviewed_at),
  }));
}

export async function listMyPurchases(userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.id, p.tour_id, p.points, p.status, p.created_at, t.title, t.slug
     FROM wallet_purchases p LEFT JOIN tours t ON t.id = p.tour_id
     WHERE p.user_id = ? ORDER BY p.id DESC LIMIT 50`,
    [userId]
  );
  return rows.map((r) => ({
    id: r.id as number,
    tourId: r.tour_id as number,
    tourTitle: (r.title as string | null) ?? "",
    tourSlug: (r.slug as string | null) ?? "",
    points: Number(r.points),
    status: r.status as string,
    createdAt: iso(r.created_at) as string,
  }));
}

// Tours a buyer can pay for with points right now.
export async function listPayableTours() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, slug, title, start_date, end_date, price_points FROM tours
     WHERE price_points IS NOT NULL AND price_points > 0 AND end_date >= UTC_DATE()
     ORDER BY start_date, id`
  );
  return rows.map((r) => ({
    id: r.id as number,
    slug: r.slug as string,
    title: r.title as string,
    startDate: r.start_date as string,
    endDate: r.end_date as string,
    pricePoints: Number(r.price_points),
  }));
}
