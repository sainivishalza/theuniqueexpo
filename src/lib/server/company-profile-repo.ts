import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { safeParseJson } from "@/lib/server/db-helpers";
import { DEFAULT_COMPANY_PROFILE, normalizeCompanyProfile, type CompanyProfile } from "@/lib/company-profile";

export async function getCompanyProfile(): Promise<CompanyProfile> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT content FROM company_profile WHERE id = 1 LIMIT 1");
  const row = rows[0];
  if (!row) return DEFAULT_COMPANY_PROFILE;
  return normalizeCompanyProfile(safeParseJson(row.content));
}

export async function updateCompanyProfile(content: CompanyProfile): Promise<void> {
  await pool.query(
    `INSERT INTO company_profile (id, content) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE content = VALUES(content)`,
    [JSON.stringify(content)]
  );
}
