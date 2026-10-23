import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { getBuyerProfile } from "@/lib/server/buyer-profile-repo";
import { listMyRegistrations } from "@/lib/server/expo-registrations-repo";
import { listMyTransactions } from "@/lib/server/wallet-repo";
import { safeParseJson, stripFileAnswers } from "@/lib/server/db-helpers";
import { formatBuyerNumber } from "@/lib/buyer-number";

const MAX_TRANSACTIONS = 5000;

// "Download my data": everything the site keeps about the signed-in person, as one JSON file.
// Uploaded document photos are not inside it (they are large): the file says which ones exist, and they
// can be opened from the profile page.
export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized", code: "unauthorized" }, { status: 401 });
  const limited = await checkRateLimit(`my-data:${user.id}`, 5, 60 * 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "rate_limited", code: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });

  const [accountRows] = await pool.query<RowDataPacket[]>("SELECT id, name, email, role, country, created_at, buyer_no FROM users WHERE id = ?", [user.id]);
  const a = accountRows[0];
  if (!a) return NextResponse.json({ error: "unauthorized", code: "unauthorized" }, { status: 401 });

  const [tourRows] = await pool.query<RowDataPacket[]>(
    "SELECT id, tour_id, status, created_at, custom_answers, form_schema_snapshot FROM tour_registrations WHERE user_id = ? ORDER BY id DESC",
    [user.id]
  );
  const transactions = [];
  let before: number | undefined;
  for (;;) {
    const page = await listMyTransactions(user.id, before, 100);
    transactions.push(...page.items);
    if (!page.hasMore || page.items.length === 0 || transactions.length >= MAX_TRANSACTIONS) break;
    before = page.items[page.items.length - 1].id;
  }

  const data = {
    exportedAt: new Date().toISOString(),
    note: "Everything The Unique Expo keeps about this account. Uploaded document photos are not included here; open them from your profile page.",
    account: {
      id: a.id,
      name: a.name,
      email: a.email,
      role: a.role,
      country: a.country,
      registrationNumber: formatBuyerNumber(a.buyer_no) || null,
      createdAt: new Date(a.created_at).toISOString(),
    },
    buyerProfile: await getBuyerProfile(user.id),
    exhibitionRegistrations: await listMyRegistrations(user.id),
    tourRegistrations: tourRows.map((r) => ({
      id: String(r.id),
      tourId: String(r.tour_id),
      status: r.status,
      createdAt: r.created_at,
      answers: stripFileAnswers(safeParseJson(r.custom_answers), safeParseJson(r.form_schema_snapshot)),
    })),
    wallet: { transactions },
  };
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="my-data-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
