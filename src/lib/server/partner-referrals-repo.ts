import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";

export type ConversionStatus = "signed_up" | "booked_booth" | "posted_rfq";

export interface PartnerReferral {
  id: number;
  partnerId: number;
  referredUserId: number;
  referredUserName: string;
  referredUserEmail: string;
  conversionStatus: ConversionStatus;
  commission: number;
  createdAt: number;
}

export interface AdminPartnerReferral extends PartnerReferral {
  partnerName: string;
  partnerEmail: string;
}

function mapReferralRow(row: RowDataPacket): PartnerReferral {
  return {
    id: row.id,
    partnerId: row.partner_id,
    referredUserId: row.referred_user_id,
    referredUserName: row.referred_user_name,
    referredUserEmail: row.referred_user_email,
    conversionStatus: row.conversion_status,
    commission: Number(row.commission),
    createdAt: Math.floor(new Date(row.created_at).getTime() / 1000),
  };
}

// Validates the referral code is a real, currently-active partner account
// before recording anything -- a stale or tampered ?ref= value should
// silently do nothing, never fail the actual registration.
export async function isValidPartnerId(partnerId: number): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM users WHERE id = ? AND role = 'partner' AND status = 'active' LIMIT 1",
    [partnerId]
  );
  return rows.length > 0;
}

export async function createReferral(partnerId: number, referredUserId: number) {
  await pool.query(
    "INSERT INTO partner_referrals (partner_id, referred_user_id, conversion_status) VALUES (?, ?, 'signed_up')",
    [partnerId, referredUserId]
  );
}

// Called from the RFQ/expo-registration creation routes when a logged-in
// user takes that action -- upgrades their *own* referral row (if any) to
// the stronger status, one-way only (never downgrades an already-stronger
// signal back to a weaker one).
export async function upgradeReferralStatus(referredUserId: number, newStatus: ConversionStatus) {
  const rank: Record<ConversionStatus, number> = { signed_up: 0, posted_rfq: 1, booked_booth: 2 };
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, conversion_status FROM partner_referrals WHERE referred_user_id = ? LIMIT 1",
    [referredUserId]
  );
  const row = rows[0];
  if (!row) return;
  if (rank[newStatus] <= rank[row.conversion_status as ConversionStatus]) return;
  await pool.query("UPDATE partner_referrals SET conversion_status = ? WHERE id = ?", [newStatus, row.id]);
}

export async function listReferralsForPartner(partnerId: number): Promise<PartnerReferral[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT pr.*, u.name AS referred_user_name, u.email AS referred_user_email
     FROM partner_referrals pr
     JOIN users u ON u.id = pr.referred_user_id
     WHERE pr.partner_id = ?
     ORDER BY pr.created_at DESC`,
    [partnerId]
  );
  return rows.map(mapReferralRow);
}

export async function listAllReferrals(): Promise<AdminPartnerReferral[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT pr.*, u.name AS referred_user_name, u.email AS referred_user_email,
            p.name AS partner_name, p.email AS partner_email
     FROM partner_referrals pr
     JOIN users u ON u.id = pr.referred_user_id
     JOIN users p ON p.id = pr.partner_id
     ORDER BY pr.created_at DESC`
  );
  return rows.map((row) => ({ ...mapReferralRow(row), partnerName: row.partner_name, partnerEmail: row.partner_email }));
}

export async function updateReferral(id: number, input: { conversionStatus?: ConversionStatus; commission?: number }) {
  const fields: string[] = [];
  const values: unknown[] = [];
  if (input.conversionStatus !== undefined) {
    fields.push("conversion_status = ?");
    values.push(input.conversionStatus);
  }
  if (input.commission !== undefined) {
    fields.push("commission = ?");
    values.push(input.commission);
  }
  if (fields.length === 0) return;
  values.push(id);
  await pool.query<ResultSetHeader>(`UPDATE partner_referrals SET ${fields.join(", ")} WHERE id = ?`, values);
}
