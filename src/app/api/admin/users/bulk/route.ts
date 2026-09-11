import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { requireAdmin, createUserAccount } from "@/lib/auth-server";
import { upsertBuyerProfileFields } from "@/lib/server/buyer-profile-repo";

// Admin isn't offered here -- bulk-granting admin access from a pasted list
// is exactly the kind of mistake this endpoint shouldn't make easy.
const BULK_ROLES = ["buyer", "exhibitor", "partner"];

interface BulkUserInput {
  name?: string;
  email?: string;
  phone?: string;
  country?: string;
  // Optional buyer-profile fields -- only ever written when role is
  // "buyer" (see buyer_profiles/buyer-profile-repo.ts). Any row can omit
  // these entirely; a plain name/email/phone import still works exactly
  // as before.
  companyName?: string;
  nationality?: string;
  passportNumber?: string;
  annualTurnover?: string;
  purchaseIntention?: string;
  otherPurchaseIntention?: string;
  contactPerson?: string;
}

interface BulkUserResult {
  row: number;
  name: string;
  email: string;
  password: string | null;
  status: "created" | "failed";
  reason?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const role = typeof body?.role === "string" ? body.role : "";
  const users = Array.isArray(body?.users) ? (body.users as BulkUserInput[]) : null;

  if (!BULK_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (!users || users.length === 0) {
    return NextResponse.json({ error: "No users provided" }, { status: 400 });
  }
  if (users.length > 500) {
    return NextResponse.json({ error: "Import one batch of at most 500 users at a time" }, { status: 400 });
  }

  // One query for every email already in the system, rather than one query
  // per row -- this list can be a few hundred rows.
  const [existingRows] = await pool.query<RowDataPacket[]>("SELECT email FROM users");
  const existingEmails = new Set(existingRows.map((r) => String(r.email).toLowerCase()));
  const seenInBatch = new Set<string>();

  const results: BulkUserResult[] = [];

  for (let i = 0; i < users.length; i++) {
    const row = i + 1;
    const name = (users[i].name || "").trim();
    const email = (users[i].email || "").trim().toLowerCase();
    const phone = (users[i].phone || "").trim();
    const country = (users[i].country || "").trim();

    if (!name || !email || !phone) {
      results.push({ row, name, email, password: null, status: "failed", reason: "Name, email, and phone are all required" });
      continue;
    }
    if (!EMAIL_RE.test(email)) {
      results.push({ row, name, email, password: null, status: "failed", reason: "Invalid email" });
      continue;
    }
    if (existingEmails.has(email) || seenInBatch.has(email)) {
      results.push({ row, name, email, password: null, status: "failed", reason: "Email already registered" });
      continue;
    }

    try {
      const { user: created } = await createUserAccount(name, email, phone, role, country);
      seenInBatch.add(email);

      if (role === "buyer") {
        const input = users[i];
        const profileFields = {
          companyName: input.companyName?.trim() || "",
          nationality: input.nationality?.trim() || "",
          passportNumber: input.passportNumber?.trim() || "",
          annualTurnover: input.annualTurnover?.trim() || "",
          purchaseIntention: input.purchaseIntention?.trim() || "",
          otherPurchaseIntention: input.otherPurchaseIntention?.trim() || "",
          contactPerson: input.contactPerson?.trim() || "",
        };
        // Only write a profile row when at least one field was actually
        // provided -- a plain name/email/phone import shouldn't leave
        // behind an all-empty buyer_profiles row for every account.
        if (Object.values(profileFields).some(Boolean)) {
          await upsertBuyerProfileFields(created.id, profileFields);
        }
      }

      results.push({ row, name, email, password: phone, status: "created" });
    } catch (err) {
      console.error(`Bulk user create failed for row ${row} (${email}):`, err);
      results.push({ row, name, email, password: null, status: "failed", reason: "Could not create account" });
    }
  }

  return NextResponse.json({
    results,
    createdCount: results.filter((r) => r.status === "created").length,
    failedCount: results.filter((r) => r.status === "failed").length,
  });
}
