import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { safeParseJson } from "@/lib/server/db-helpers";
import { DEFAULT_CITY_PARTNERSHIPS_CONTENT, normalizeCityPartnershipsContent, type CityPartnershipsContent } from "@/lib/city-partnerships-content";

export async function getCityPartnershipsContent(): Promise<CityPartnershipsContent> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT content FROM city_partnerships_content WHERE id = 1 LIMIT 1");
  const row = rows[0];
  if (!row) return DEFAULT_CITY_PARTNERSHIPS_CONTENT;
  return normalizeCityPartnershipsContent(safeParseJson(row.content));
}

export async function updateCityPartnershipsContent(content: CityPartnershipsContent): Promise<void> {
  await pool.query(
    `INSERT INTO city_partnerships_content (id, content) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE content = VALUES(content)`,
    [JSON.stringify(content)]
  );
}
