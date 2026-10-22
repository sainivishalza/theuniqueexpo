import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { EXPENSE_CATEGORIES, isValidClientKey } from "@/lib/wallet";
import { isValidDateOnly } from "@/lib/registration-lifecycle";
import { createExpenseClaim, listMyExpenseClaims } from "@/lib/server/wallet-repo";
import { isValidUploadedDocument } from "@/lib/server/validate-upload";
import { limitOrNull, MAX_WALLET_IMAGE_BYTES, readJson, requireBuyer, text, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

export async function GET(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  try {
    return NextResponse.json({ items: await listMyExpenseClaims(auth.user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}

// Upload travel receipts for review. Nothing is paid until an admin has looked at them
// and decided how many points they are worth.
export async function POST(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  const body = await readJson(request);
  if (!body) return walletFail("invalid_input");
  if (!isValidClientKey(body.key)) return walletFail("invalid_input");

  const category = typeof body.category === "string" ? body.category : "";
  if (!(EXPENSE_CATEGORIES as readonly string[]).includes(category)) return walletFail("invalid_input");
  const title = text(body.title, 150);
  if (!title) return walletFail("invalid_input");

  let expenseDate: string | null = null;
  if (body.expenseDate !== undefined && body.expenseDate !== null && body.expenseDate !== "") {
    if (!isValidDateOnly(body.expenseDate)) return walletFail("invalid_input");
    const day = body.expenseDate as string;
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const oldest = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (day > tomorrow || day < oldest) return walletFail("invalid_input");
    expenseDate = day;
  }

  const receipts = body.receipts;
  if (!Array.isArray(receipts) || receipts.length < 1 || receipts.length > 3) return walletFail("invalid_input");
  if (!receipts.every((r) => isValidUploadedDocument(r, MAX_WALLET_IMAGE_BYTES))) return walletFail("invalid_input");

  let exhibitionId: number | null = null;
  if (body.exhibitionId !== undefined && body.exhibitionId !== null && body.exhibitionId !== "") {
    if (typeof body.exhibitionId !== "number" || !Number.isSafeInteger(body.exhibitionId) || body.exhibitionId <= 0) return walletFail("invalid_input");
    const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM exhibitions WHERE id = ?", [body.exhibitionId]);
    if (!rows[0]) return walletFail("invalid_input");
    exhibitionId = body.exhibitionId;
  }

  const limited = await limitOrNull(auth.user.id, "expense", 20, 24 * 60 * 60 * 1000);
  if (limited) return limited;
  try {
    const result = await createExpenseClaim(auth.user.id, {
      exhibitionId,
      category,
      title,
      expenseDate,
      amountText: text(body.amountText, 60),
      note: text(body.note, 500),
      receipts: receipts as string[],
      key: body.key,
    });
    return NextResponse.json(result, { status: result.replayed ? 200 : 201 });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
