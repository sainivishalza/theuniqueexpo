import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";

// Saved filters for the admin lists. Private to the admin who saved them.
export const VIEW_PAGES = ["buyer-profiles", "registrations"] as const;
const MAX_PER_PAGE = 30;
const MAX_FILTERS_BYTES = 2000;

function pageOf(value: unknown): (typeof VIEW_PAGES)[number] | null {
  return typeof value === "string" && (VIEW_PAGES as readonly string[]).includes(value) ? (value as (typeof VIEW_PAGES)[number]) : null;
}

async function listViews(adminId: number, page: string) {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT id, name, filters_json FROM admin_saved_views WHERE admin_id = ? AND page = ? ORDER BY name", [adminId, page]);
    return rows.map((r) => {
      let filters: Record<string, string> = {};
      try { filters = JSON.parse(String(r.filters_json)); } catch {}
      return { id: Number(r.id), name: String(r.name), filters };
    });
  } catch (err) {
    if ((err as { code?: string }).code === "ER_NO_SUCH_TABLE") return [];
    throw err;
  }
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const page = pageOf(new URL(request.url).searchParams.get("page"));
  if (!page) return NextResponse.json({ error: "Unknown page", code: "bad_page" }, { status: 400 });
  return NextResponse.json({ views: await listViews(admin.id, page) });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const page = pageOf(body?.page);
  if (!page) return NextResponse.json({ error: "Unknown page", code: "bad_page" }, { status: 400 });
  const name = typeof body?.name === "string" ? body.name.replace(/\s+/g, " ").trim() : "";
  if (name.length < 1 || name.length > 80) return NextResponse.json({ error: "Give the view a name of up to 80 characters", code: "bad_name" }, { status: 400 });
  // Filters are plain text values only (the lists decide what a value means), so nothing odd can be stored.
  const filters: Record<string, string> = {};
  if (!body?.filters || typeof body.filters !== "object" || Array.isArray(body.filters)) return NextResponse.json({ error: "Bad filters", code: "bad_filters" }, { status: 400 });
  for (const [k, v] of Object.entries(body.filters as Record<string, unknown>)) {
    if (!/^[A-Za-z]{1,30}$/.test(k) || typeof v !== "string" || v.length > 300) return NextResponse.json({ error: "Bad filters", code: "bad_filters" }, { status: 400 });
    filters[k] = v;
  }
  const json = JSON.stringify(filters);
  if (Buffer.byteLength(json) > MAX_FILTERS_BYTES) return NextResponse.json({ error: "Bad filters", code: "bad_filters" }, { status: 400 });
  try {
    const [count] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM admin_saved_views WHERE admin_id = ? AND page = ? AND name <> ?", [admin.id, page, name]);
    if (Number(count[0]?.n ?? 0) >= MAX_PER_PAGE) return NextResponse.json({ error: "Too many saved views", code: "limit" }, { status: 409 });
    const [before] = await pool.query<RowDataPacket[]>("SELECT id FROM admin_saved_views WHERE admin_id = ? AND page = ? AND name = ?", [admin.id, page, name]);
    await pool.query(
      "INSERT INTO admin_saved_views (admin_id, page, name, filters_json) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE filters_json = VALUES(filters_json)",
      [admin.id, page, name, json]
    );
    const views = await listViews(admin.id, page);
    return NextResponse.json({ ok: true, replaced: before.length > 0, id: views.find((v) => v.name === name)?.id ?? null, views });
  } catch (err) {
    if ((err as { code?: string }).code === "ER_NO_SUCH_TABLE") return NextResponse.json({ error: "Saved views are not available yet", code: "unavailable" }, { status: 503 });
    throw err;
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const id = Number(params.get("id"));
  const page = pageOf(params.get("page"));
  if (!page || !Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 });
  const [res] = await pool.query<import("mysql2/promise").ResultSetHeader>("DELETE FROM admin_saved_views WHERE id = ? AND admin_id = ? AND page = ?", [id, admin.id, page]);
  if (res.affectedRows === 0) return NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, views: await listViews(admin.id, page) });
}
