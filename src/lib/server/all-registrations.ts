import type { RowDataPacket } from "mysql2/promise";
import ExcelJS from "exceljs";
import pool from "@/lib/db";
import { isPlaceholderEmail } from "@/lib/login-id";
import { formatBuyerNumber } from "@/lib/buyer-number";
import { REGISTRATION_STATUSES } from "@/lib/registration-lifecycle";

// Every exhibition registration of every buyer in one list, filtered on the server (a busy site has thousands
// of them, so the browser only ever gets one page). Registrations made with an organiser's own form have no
// name, company or country of their own: those come from the buyer's account and profile.

export interface AllRegistrationsFilter {
  exhibition?: string;
  status?: string;
  country?: string;
  q?: string;
}

export interface AllRegistrationRow {
  id: string;
  buyerNumber: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  country: string;
  exhibitionSlug: string;
  exhibitionTitle: string;
  status: string;
  effectiveStatus: string;
  confirmBy: string | null;
  createdAt: string;
}

export interface AllRegistrationsPage {
  rows: AllRegistrationRow[];
  /** Registrations matching the filter (all pages). */
  total: number;
  /** By status, for the current exhibition / country / search (the status filter itself is not applied to these). */
  counts: Record<string, number>;
  exhibitions: { slug: string; title: string; count: number }[];
  countries: string[];
}

export const MAX_EXPORT_ROWS = 20000;
export const ALL_REGISTRATIONS_PAGE_SIZE = 50;

const EFFECTIVE = `CASE WHEN r.status = 'approved' AND r.confirm_by IS NOT NULL AND r.confirm_by < UTC_DATE() THEN 'expired' ELSE r.status END`;
const COUNTRY = `COALESCE(NULLIF(r.nationality, ''), NULLIF(bp.nationality, ''), '')`;
const FROM = `FROM expo_registrations r
  JOIN exhibitions e ON e.id = r.exhibition_id
  LEFT JOIN users u ON u.id = r.user_id
  LEFT JOIN buyer_profiles bp ON bp.user_id = r.user_id`;

/** The filter from the query string; anything not recognised is simply not applied. */
export function readFilter(searchParams: URLSearchParams): AllRegistrationsFilter {
  const status = searchParams.get("status") ?? "";
  const valid = status === "expired" || (REGISTRATION_STATUSES as readonly string[]).includes(status);
  return {
    exhibition: (searchParams.get("exhibition") ?? "").slice(0, 200) || undefined,
    status: valid ? status : undefined,
    country: (searchParams.get("country") ?? "").slice(0, 100) || undefined,
    q: (searchParams.get("q") ?? "").slice(0, 100) || undefined,
  };
}

function likeEscape(text: string): string {
  return text.replace(/[\\%_]/g, (m) => `\\${m}`);
}

// The conditions for everything except the status, then the status on its own (the counts need them apart).
function conditions(f: AllRegistrationsFilter): { where: string[]; params: unknown[] } {
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.exhibition) {
    where.push("e.slug = ?");
    params.push(f.exhibition);
  }
  if (f.country) {
    where.push(`${COUNTRY} = ?`);
    params.push(f.country);
  }
  const q = (f.q ?? "").trim().slice(0, 100);
  if (q) {
    const like = `%${likeEscape(q)}%`;
    const parts = [
      "r.full_name LIKE ?", "u.name LIKE ?", "r.email LIKE ?", "u.email LIKE ?", "r.company_name LIKE ?", "bp.company_name LIKE ?",
      "r.phone LIKE ?", "bp.phone_number LIKE ?", "r.passport_number LIKE ?", "e.title LIKE ?",
    ];
    params.push(...parts.map(() => like));
    const number = /^tue\s*0*(\d{1,9})$/i.exec(q);
    if (number) {
      parts.push("u.buyer_no = ?");
      params.push(Number(number[1]));
    }
    where.push(`(${parts.join(" OR ")})`);
  }
  return { where, params };
}

function mapRow(r: RowDataPacket): AllRegistrationRow {
  const email = String(r.email_r || r.email_u || "");
  return {
    id: String(r.id),
    buyerNumber: formatBuyerNumber(r.buyer_no),
    name: String(r.name_r || r.name_u || ""),
    email: isPlaceholderEmail(email) ? "" : email,
    phone: String(r.phone_r || r.phone_p || ""),
    company: String(r.company_r || r.company_p || ""),
    country: String(r.country || ""),
    exhibitionSlug: String(r.slug),
    exhibitionTitle: String(r.title),
    status: String(r.status),
    effectiveStatus: String(r.effective_status),
    confirmBy: r.confirm_by ? new Date(r.confirm_by).toISOString().slice(0, 10) : null,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

const COLUMNS = `r.id, r.status, r.confirm_by, r.created_at, e.slug, e.title, u.buyer_no, ${EFFECTIVE} AS effective_status,
  NULLIF(r.full_name, '') AS name_r, u.name AS name_u, NULLIF(r.email, '') AS email_r, u.email AS email_u,
  NULLIF(r.phone, '') AS phone_r, bp.phone_number AS phone_p, NULLIF(r.company_name, '') AS company_r, bp.company_name AS company_p,
  ${COUNTRY} AS country`;

function statusClause(status: string | undefined): { sql: string; params: unknown[] } {
  if (!status || status === "all") return { sql: "", params: [] };
  return { sql: `${EFFECTIVE} = ?`, params: [status] };
}

export async function listAllRegistrations(f: AllRegistrationsFilter, page: number, pageSize = ALL_REGISTRATIONS_PAGE_SIZE): Promise<AllRegistrationsPage> {
  const base = conditions(f);
  const st = statusClause(f.status);
  const where = [...base.where, ...(st.sql ? [st.sql] : [])];
  const params = [...base.params, ...st.params];
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const baseSql = base.where.length ? `WHERE ${base.where.join(" AND ")}` : "";

  const [[totalRow]] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS n ${FROM} ${whereSql}`, params);
  const total = Number(totalRow.n);
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const offset = (Math.min(Math.max(1, page), lastPage) - 1) * pageSize;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${COLUMNS} ${FROM} ${whereSql} ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  const [countRows] = await pool.query<RowDataPacket[]>(`SELECT ${EFFECTIVE} AS s, COUNT(*) AS n ${FROM} ${baseSql} GROUP BY s`, base.params);
  const counts: Record<string, number> = {};
  for (const c of countRows) counts[String(c.s)] = Number(c.n);

  // The pick-lists: exhibitions that have registrations, and the countries seen (not narrowed by the current choice).
  const [expoRows] = await pool.query<RowDataPacket[]>(
    `SELECT e.slug, e.title, COUNT(*) AS n FROM expo_registrations r JOIN exhibitions e ON e.id = r.exhibition_id GROUP BY e.id, e.slug, e.title ORDER BY MAX(e.start_date) DESC, e.title`
  );
  const [countryRows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT ${COUNTRY} AS c ${FROM} HAVING c <> '' ORDER BY c`
  );
  return {
    rows: rows.map(mapRow),
    total,
    counts,
    exhibitions: expoRows.map((e) => ({ slug: String(e.slug), title: String(e.title), count: Number(e.n) })),
    countries: countryRows.map((c) => String(c.c)),
  };
}

const EXPORT_HEADERS = ["Registration No.", "Buyer No.", "Name", "E-mail", "Phone", "Company", "Country", "Exhibition", "Status", "Confirm by", "Registered on"];

/** The filtered list as an Excel sheet (not the page: everything that matches, up to MAX_EXPORT_ROWS). */
export async function buildAllRegistrationsExcel(f: AllRegistrationsFilter): Promise<{ buffer: Buffer; count: number; truncated: boolean }> {
  const base = conditions(f);
  const st = statusClause(f.status);
  const where = [...base.where, ...(st.sql ? [st.sql] : [])];
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${COLUMNS} ${FROM} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY r.created_at DESC, r.id DESC LIMIT ?`,
    [...base.params, ...st.params, MAX_EXPORT_ROWS + 1]
  );
  const truncated = rows.length > MAX_EXPORT_ROWS;
  const list = rows.slice(0, MAX_EXPORT_ROWS).map(mapRow);
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Registrations", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.addRow(EXPORT_HEADERS).font = { bold: true };
  for (const r of list) {
    sheet.addRow([Number(r.id), r.buyerNumber, r.name, r.email, r.phone, r.company, r.country, r.exhibitionTitle, r.effectiveStatus, r.confirmBy ?? "", r.createdAt.slice(0, 10)]);
  }
  // A cell that starts with = + - @ would be read as a formula by a spreadsheet: keep what buyers typed as text.
  sheet.eachRow((row, i) => {
    if (i === 1) return;
    row.eachCell((cell) => {
      if (typeof cell.value === "string" && /^[=+\-@\t\r]/.test(cell.value)) cell.value = `'${cell.value}`;
    });
  });
  sheet.columns.forEach((col, i) => { col.width = [14, 14, 26, 30, 18, 28, 18, 36, 12, 12, 14][i] ?? 16; });
  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  return { buffer, count: list.length, truncated };
}
