import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { getCompanyProfile, updateCompanyProfile } from "@/lib/server/company-profile-repo";
import { isAllowedImageContentType } from "@/lib/server/validate-upload";

const NAME = "wechat_qr";
const DATA_URL = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/]+=*)$/i;

/** The QR code picture as bytes, or null when none was uploaded (or the table does not exist yet). */
export async function getWechatQr(): Promise<{ type: string; bytes: Buffer; version: string } | null> {
  let rows: RowDataPacket[];
  try {
    [rows] = await pool.query<RowDataPacket[]>("SELECT content, UNIX_TIMESTAMP(updated_at) AS stamp FROM site_assets WHERE name = ?", [NAME]);
  } catch (err) {
    if ((err as { code?: string }).code === "ER_NO_SUCH_TABLE") return null;
    throw err;
  }
  const m = rows[0] ? DATA_URL.exec(String(rows[0].content)) : null;
  if (!m || !isAllowedImageContentType(m[1])) return null;
  return { type: m[1].toLowerCase(), bytes: Buffer.from(m[2], "base64"), version: String(rows[0].stamp) };
}

/** Saves (a data URL) or removes (null) the QR code and updates the stamp in the company details that tells the site to offer it. */
export async function setWechatQr(dataUrl: string | null): Promise<void> {
  if (dataUrl === null) await pool.query("DELETE FROM site_assets WHERE name = ?", [NAME]);
  else await pool.query("INSERT INTO site_assets (name, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = VALUES(content)", [NAME, dataUrl]);
  const stored = dataUrl === null ? null : await getWechatQr();
  const profile = await getCompanyProfile();
  await updateCompanyProfile({ ...profile, wechatQrVersion: stored ? stored.version : "" });
}
