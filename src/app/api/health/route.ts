import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

// "Is the site up and can it reach its database?" For the nightly live check and any uptime monitor.
// Answers only yes or no: no versions, hosts or error text. The result is kept for 10 seconds so that
// many callers cannot turn this page into a stream of database queries.
let last: { at: number; ok: boolean } | null = null;
const KEEP_MS = 10_000;

export async function GET() {
  const now = Date.now();
  if (!last || now - last.at > KEEP_MS) {
    let ok = false;
    try {
      await pool.query("SELECT 1");
      ok = true;
    } catch {
      ok = false;
    }
    last = { at: now, ok };
  }
  return NextResponse.json({ ok: last.ok }, { status: last.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
