import crypto from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { PLACEHOLDER_EMAIL_DOMAIN } from "@/lib/login-id";

// A person deletes their own account. Money is never destroyed or forgotten: the account cannot be deleted while it still holds
// reward points or has a top-up, withdrawal or expense claim waiting, so the person first withdraws, spends or sends the points.
// Then everything personal goes (profile, documents, contact details, inquiries, reviews, favourites, notifications, receipts and
// payout details), registrations stay only as anonymous counts for the exhibition, and the account itself stays as an empty shell
// ("Deleted account", an address that cannot receive mail, a password nobody knows) because wallet entries and registrations
// point at it and must keep adding up. Everything is done in one database transaction: it all happens or none of it does.

export type DeleteBlocker = "admin_account" | "wallet_balance" | "pending_money" | "already_deleted";

export interface DeletionCheck {
  blockers: DeleteBlocker[];
  balance: number;
  pendingMoney: number;
  /** Registrations for exhibitions and tours that have not ended: they are cancelled when the account is deleted. */
  upcomingRegistrations: number;
}

export async function checkAccountDeletion(userId: number): Promise<DeletionCheck | null> {
  const [users] = await pool.query<RowDataPacket[]>("SELECT id, role, status FROM users WHERE id = ?", [userId]);
  const u = users[0];
  if (!u) return null;
  const blockers: DeleteBlocker[] = [];
  if (u.role === "admin") blockers.push("admin_account");
  const deletedAt = await safeScalar("SELECT deleted_at AS v FROM users WHERE id = ?", [userId]);
  if (deletedAt) blockers.push("already_deleted");
  const balance = Number((await safeScalar("SELECT balance AS v FROM wallets WHERE user_id = ?", [userId])) ?? 0);
  const pendingMoney =
    Number((await safeScalar("SELECT COUNT(*) AS v FROM wallet_withdrawals WHERE user_id = ? AND status = 'pending'", [userId])) ?? 0) +
    Number((await safeScalar("SELECT COUNT(*) AS v FROM wallet_topups WHERE user_id = ? AND status = 'pending'", [userId])) ?? 0) +
    Number((await safeScalar("SELECT COUNT(*) AS v FROM wallet_expense_claims WHERE user_id = ? AND status = 'pending'", [userId])) ?? 0);
  if (balance > 0) blockers.push("wallet_balance");
  if (pendingMoney > 0) blockers.push("pending_money");
  const upcoming =
    Number((await safeScalar(
      `SELECT COUNT(*) AS v FROM expo_registrations r JOIN exhibitions e ON e.id = r.exhibition_id
       WHERE r.user_id = ? AND r.status IN ('pending','approved','confirmed') AND e.end_date >= UTC_DATE()`, [userId])) ?? 0) +
    Number((await safeScalar(
      `SELECT COUNT(*) AS v FROM tour_registrations r JOIN tours t ON t.id = r.tour_id
       WHERE r.user_id = ? AND r.status IN ('pending','approved') AND t.end_date >= UTC_DATE()`, [userId])) ?? 0);
  return { blockers, balance, pendingMoney, upcomingRegistrations: upcoming };
}

async function safeScalar(sql: string, params: unknown[]): Promise<unknown> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(sql, params as never[]);
    return rows[0]?.v ?? null;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "ER_NO_SUCH_TABLE" || code === "ER_BAD_FIELD_ERROR") return null;
    throw err;
  }
}

// Rows that exist only because of this person: gone.
const DELETE_BY_USER: [table: string, column: string][] = [
  ["buyer_profile_expos", "user_id"],
  ["buyer_custom_documents", "user_id"],
  ["buyer_custom_values", "user_id"],
  ["buyer_extra_info", "user_id"],
  ["buyer_pending_documents", "user_id"],
  ["document_share_links", "user_id"],
  ["document_alerts_sent", "user_id"],
  ["buyer_profiles", "user_id"],
  ["email_changes", "user_id"],
  ["referral_codes", "user_id"],
  ["password_resets", "user_id"],
  ["saved_exhibition_alerts", "user_id"],
  ["exhibition_favorites", "user_id"],
  ["user_notifications", "user_id"],
  ["exhibitor_reviews", "user_id"],
  ["tour_reviews", "user_id"],
  ["group_invites", "inviter_id"],
  ["hotel_bookings", "user_id"],
  ["business_trip_inquiries", "user_id"],
  ["consultation_bookings", "user_id"],
  ["visa_applications", "user_id"],
  ["tour_applications", "user_id"],
  ["moving_quotes", "user_id"],
  ["moving_requests", "user_id"],
  ["partner_applications", "user_id"],
  ["partner_inquiries", "user_id"],
  ["subsidy_applications", "user_id"],
  ["conference_inquiries", "user_id"],
  ["city_partnership_inquiries", "user_id"],
];

// Tables that hold an address on its own (not tied to the account).
const BY_EMAIL: [table: string, column: string][] = [
  ["email_bounces", "email"],
  ["newsletter_subscribers", "email"],
  ["group_invites", "email"],
  ["business_trip_inquiries", "email"],
  ["consultation_bookings", "email"],
  ["visa_applications", "email"],
  ["tour_applications", "email"],
  ["moving_quotes", "email"],
  ["moving_requests", "email"],
  ["partner_applications", "email"],
  ["partner_inquiries", "email"],
  ["subsidy_applications", "email"],
  ["conference_inquiries", "email"],
  ["city_partnership_inquiries", "email"],
];

// Columns of an exhibition registration that identify the person or hold their files.
const EXPO_REGISTRATION_PERSONAL = [
  "gender", "full_name", "nationality", "passport_number", "company_name", "company_website", "phone", "email", "company_type", "company_type_other",
  "company_scale", "company_intro", "purpose_of_visit", "info_source", "info_source_other", "exporting_markets", "exporting_market_other",
  "doc_passport_front", "doc_business_card", "doc_visa_page", "doc_business_license", "doc_order_list", "doc_ticket", "custom_answers",
  "arrival_note", "feedback_comment",
];

async function blankColumns(conn: PoolConnection, table: string, columns: string[], where: string, params: unknown[]): Promise<void> {
  // Which of these columns exist, and which of them may be empty (NULL) or need an empty text instead.
  const [meta] = await conn.query<RowDataPacket[]>(
    "SELECT column_name AS name, is_nullable AS nullable, data_type AS type FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name IN (?)",
    [table, columns]
  );
  if (meta.length === 0) return;
  const sets = meta.map((m) => {
    if (m.nullable === "YES") return `\`${m.name}\` = NULL`;
    return /int|decimal|float|double/.test(String(m.type)) ? `\`${m.name}\` = 0` : `\`${m.name}\` = ''`;
  });
  await conn.query(`UPDATE \`${table}\` SET ${sets.join(", ")} WHERE ${where}`, params as never[]);
}

async function tolerant(run: () => Promise<unknown>): Promise<void> {
  try {
    await run();
  } catch (err) {
    const code = (err as { code?: string }).code;
    // A table that does not exist on this site yet has nothing to clear.
    if (code !== "ER_NO_SUCH_TABLE" && code !== "ER_BAD_FIELD_ERROR") throw err;
  }
}

/** Deletes the account. Returns false when it cannot be done (the blockers say why); throws on a database failure (nothing changed). */
export async function deleteAccount(userId: number): Promise<{ ok: true; cancelled: number } | { ok: false; blockers: DeleteBlocker[] }> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Lock the account (and its wallet) so a transfer or withdrawal cannot slip in between the check and the deletion.
    await conn.query("SELECT id FROM users WHERE id = ? FOR UPDATE", [userId]);
    await tolerant(() => conn.query("SELECT user_id FROM wallets WHERE user_id = ? FOR UPDATE", [userId]));
    const check = await checkInTx(conn, userId);
    if (check.blockers.length > 0) {
      await conn.rollback();
      return { ok: false, blockers: check.blockers };
    }

    for (const [table, column] of DELETE_BY_USER) await tolerant(() => conn.query(`DELETE FROM \`${table}\` WHERE \`${column}\` = ?`, [userId]));

    // Registrations stay for the exhibition's numbers, without the person: upcoming ones are cancelled first.
    let cancelled = 0;
    await tolerant(async () => {
      const [res] = await conn.query(
        `UPDATE expo_registrations r JOIN exhibitions e ON e.id = r.exhibition_id SET r.status = 'cancelled', r.cancelled_at = UTC_TIMESTAMP()
         WHERE r.user_id = ? AND r.status IN ('pending','approved','confirmed') AND e.end_date >= UTC_DATE()`,
        [userId]
      );
      cancelled += (res as { affectedRows?: number }).affectedRows ?? 0;
    });
    await blankColumnsTolerant(conn, "expo_registrations", EXPO_REGISTRATION_PERSONAL, "user_id = ?", [userId]);
    await tolerant(async () => {
      const [res] = await conn.query(
        `UPDATE tour_registrations r JOIN tours t ON t.id = r.tour_id SET r.status = 'rejected'
         WHERE r.user_id = ? AND r.status IN ('pending','approved') AND t.end_date >= UTC_DATE()`,
        [userId]
      );
      cancelled += (res as { affectedRows?: number }).affectedRows ?? 0;
    });
    await blankColumnsTolerant(conn, "tour_registrations", ["custom_answers"], "user_id = ?", [userId]);

    // Marketplace requests and messages: the content stays for the other side of the conversation, the person's name and words go.
    await tolerant(() => conn.query("UPDATE rfqs SET buyer_name = 'Deleted account' WHERE buyer_id = ?", [userId]));
    await tolerant(() => conn.query("UPDATE messages SET sender_name = 'Deleted account', body = '[Message deleted]' WHERE sender_id = ?", [userId]));

    // Money records keep their amounts; the files and payout details they carry are wiped (nothing is pending, so none is needed).
    await blankColumnsTolerant(conn, "wallet_withdrawals", ["qr_image", "account_name", "bank_name", "bank_branch", "bank_account", "note"], "user_id = ?", [userId]);
    await blankColumnsTolerant(conn, "wallet_topups", ["proof", "note"], "user_id = ?", [userId]);
    await blankColumnsTolerant(conn, "wallet_expense_claims", ["receipts", "note", "qr_text"], "user_id = ?", [userId]);
    await tolerant(() => conn.query("UPDATE wallet_expense_claims SET receipt_count = 0, receipts = '[]' WHERE user_id = ?", [userId]));

    // The mail log keeps its counts, not the address.
    const [oldAddress] = await conn.query<RowDataPacket[]>("SELECT email FROM users WHERE id = ?", [userId]);
    const email = String(oldAddress[0]?.email ?? "");
    await tolerant(() => conn.query("UPDATE email_log SET to_email = 'deleted', subject = '', error = '' WHERE user_id = ?", [userId]));
    if (email) {
      // Anything else that holds the address: the newsletter, invitations sent to it, bounce records, and requests sent while not signed in.
      for (const [table, column] of BY_EMAIL) await tolerant(() => conn.query(`DELETE FROM \`${table}\` WHERE LOWER(\`${column}\`) = LOWER(?)`, [email]));
    }

    // The account itself: an empty shell nobody can sign in to or e-mail.
    const unusablePassword = `deleted:${crypto.randomBytes(24).toString("hex")}`;
    await conn.query(
      `UPDATE users SET name = 'Deleted account', email = ?, password_hash = ?, country = '', status = 'suspended', password_changed_at = UNIX_TIMESTAMP()
       WHERE id = ?`,
      [`deleted-${userId}@${PLACEHOLDER_EMAIL_DOMAIN}`, unusablePassword, userId]
    );
    await tolerant(() => conn.query("UPDATE users SET deleted_at = UTC_TIMESTAMP(), preferred_locale = NULL, mail_digest = 0, mail_saved_alerts = 0, digest_sent_at = NULL WHERE id = ?", [userId]));
    await conn.commit();
    return { ok: true, cancelled };
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

async function blankColumnsTolerant(conn: PoolConnection, table: string, columns: string[], where: string, params: unknown[]): Promise<void> {
  await tolerant(() => blankColumns(conn, table, columns, where, params));
}

// The same checks as checkAccountDeletion, on the connection that holds the locks.
async function checkInTx(conn: PoolConnection, userId: number): Promise<DeletionCheck> {
  const one = async (sql: string): Promise<number> => {
    try {
      const [rows] = await conn.query<RowDataPacket[]>(sql, [userId]);
      return Number(rows[0]?.v ?? 0);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "ER_NO_SUCH_TABLE" || code === "ER_BAD_FIELD_ERROR") return 0;
      throw err;
    }
  };
  const [users] = await conn.query<RowDataPacket[]>("SELECT role FROM users WHERE id = ?", [userId]);
  const blockers: DeleteBlocker[] = [];
  if (users[0]?.role === "admin") blockers.push("admin_account");
  if (await one("SELECT COUNT(*) AS v FROM users WHERE id = ? AND deleted_at IS NOT NULL")) blockers.push("already_deleted");
  const balance = await one("SELECT balance AS v FROM wallets WHERE user_id = ?");
  const pendingMoney =
    (await one("SELECT COUNT(*) AS v FROM wallet_withdrawals WHERE user_id = ? AND status = 'pending'")) +
    (await one("SELECT COUNT(*) AS v FROM wallet_topups WHERE user_id = ? AND status = 'pending'")) +
    (await one("SELECT COUNT(*) AS v FROM wallet_expense_claims WHERE user_id = ? AND status = 'pending'"));
  if (balance > 0) blockers.push("wallet_balance");
  if (pendingMoney > 0) blockers.push("pending_money");
  return { blockers, balance, pendingMoney, upcomingRegistrations: 0 };
}
