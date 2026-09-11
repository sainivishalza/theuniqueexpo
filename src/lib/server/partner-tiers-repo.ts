import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";
import { safeParseArray } from "@/lib/server/db-helpers";

export interface PartnerTierInput {
  name: string;
  tagline: string;
  priceLabel: string;
  commissionRate: string;
  benefits: string[];
  badgeTone: string;
  displayOrder: number;
}

function mapPartnerTierRow(row: RowDataPacket) {
  return {
    id: String(row.id),
    name: row.name,
    tagline: row.tagline,
    priceLabel: row.price_label,
    commissionRate: row.commission_rate,
    benefits: safeParseArray(row.benefits),
    badgeTone: row.badge_tone,
    displayOrder: row.display_order,
  };
}

export async function listPartnerTiers() {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM partner_tiers ORDER BY display_order ASC, id ASC");
  return rows.map(mapPartnerTierRow);
}

export async function getPartnerTierById(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM partner_tiers WHERE id = ? LIMIT 1", [id]);
  const row = rows[0];
  return row ? mapPartnerTierRow(row) : null;
}

export async function createPartnerTier(input: PartnerTierInput) {
  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO partner_tiers (name, tagline, price_label, commission_rate, benefits, badge_tone, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      input.name,
      input.tagline,
      input.priceLabel,
      input.commissionRate,
      JSON.stringify(input.benefits || []),
      input.badgeTone || "gray",
      input.displayOrder,
    ]
  );
  return result.insertId;
}

export async function updatePartnerTier(id: number, input: PartnerTierInput) {
  await pool.query(
    "UPDATE partner_tiers SET name=?, tagline=?, price_label=?, commission_rate=?, benefits=?, badge_tone=?, display_order=? WHERE id=?",
    [
      input.name,
      input.tagline,
      input.priceLabel,
      input.commissionRate,
      JSON.stringify(input.benefits || []),
      input.badgeTone || "gray",
      input.displayOrder,
      id,
    ]
  );
}

export async function deletePartnerTier(id: number) {
  await pool.query("DELETE FROM partner_tiers WHERE id = ?", [id]);
}
