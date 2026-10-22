import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/server/audit-log";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { requireAdmin, createUserAccount } from "@/lib/auth-server";
import { getBuyerNumber } from "@/lib/server/buyer-numbers";
import { upsertBuyerProfileFields, type BuyerProfileFields } from "@/lib/server/buyer-profile-repo";
import { addBuyerExpoIds, findOrCreateExpoIds } from "@/lib/server/buyer-expos-repo";
import { normalizeLoginPhone, normalizePassportNumber, placeholderEmail } from "@/lib/login-id";

// Imports buyers from a prepared file (built from expo spreadsheets). Someone
// who is already registered -- same email, or same passport number -- is never
// created again and none of their details are changed: only the expos in the
// row are added to them. People with no email sign in with their phone or
// passport number (see verifyUserPassword) and get a placeholder email.
//
// Send at most 40 buyers per request: every new account costs a bcrypt hash.

const MAX_PER_REQUEST = 40;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Profile fields a file row may carry (everything except expos, which are
// names, and the registration code, which stays admin-typed).
const PROFILE_KEYS = [
  "companyName", "nationality", "annualTurnover", "purchaseIntention", "otherPurchaseIntention",
  "contactPerson", "departureCity", "attendanceDay", "meetingOrVisiting", "passportName", "gender",
  "overseasCompanyAddress", "companyField", "jobTitle", "dateOfBirth", "visaType", "visaExpireDate",
] as const;

interface ImportRow {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  wechatId?: unknown;
  passportNumber?: unknown;
  country?: unknown;
  password?: unknown;
  expos?: unknown;
  [key: string]: unknown;
}

type ImportStatus = "created" | "expo_added" | "already_registered" | "failed";

interface ImportResult {
  row: number;
  name: string;
  // The buyer's registration number (TUE0001) -- new or existing account.
  buyerNumber?: string;
  loginId: string;
  password: string | null;
  status: ImportStatus;
  reason?: string;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

async function findUserIdByEmail(email: string): Promise<{ id: number; role: string } | null> {
  if (!email) return null;
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id, role FROM users WHERE email = ? LIMIT 1", [email]);
  return rows[0] ? { id: rows[0].id, role: rows[0].role } : null;
}

async function findUserIdByPassport(passport: string): Promise<{ id: number; role: string } | null> {
  if (!passport) return null;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.role FROM buyer_profiles p JOIN users u ON u.id = p.user_id
     WHERE UPPER(REPLACE(REPLACE(REPLACE(p.passport_number, ' ', ''), '-', ''), '.', '')) = ?
     ORDER BY u.id LIMIT 1`,
    [passport]
  );
  return rows[0] ? { id: rows[0].id, role: rows[0].role } : null;
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const buyers = Array.isArray(body?.buyers) ? (body.buyers as ImportRow[]) : null;
  if (!buyers || buyers.length === 0) return NextResponse.json({ error: "No buyers provided" }, { status: 400 });
  if (buyers.length > MAX_PER_REQUEST) {
    return NextResponse.json({ error: `Send at most ${MAX_PER_REQUEST} buyers per request` }, { status: 400 });
  }

  const results: ImportResult[] = [];

  for (let i = 0; i < buyers.length; i++) {
    const input = buyers[i] || {};
    const row = Number.isInteger(input.row) ? Number(input.row) : i + 1;
    const name = str(input.name);
    const emailRaw = str(input.email).toLowerCase();
    const email = EMAIL_RE.test(emailRaw) ? emailRaw : "";
    const phone = normalizeLoginPhone(str(input.phone));
    const passport = normalizePassportNumber(str(input.passportNumber));
    const password = str(input.password);
    const loginId = email || phone || passport;
    const fail = (reason: string) => results.push({ row, name, loginId, password: null, status: "failed", reason });

    try {
      if (!name) { fail("Missing name"); continue; }
      if (!email && !phone && !passport) { fail("No email, phone or passport number to sign in with"); continue; }

      const expoNames = Array.isArray(input.expos) ? input.expos.map(str).filter(Boolean) : [];
      const expoIds = await findOrCreateExpoIds(expoNames);

      // Already registered? Same email or same passport number.
      const placeholder = !email ? (phone ? placeholderEmail("phone", phone) : placeholderEmail("passport", passport)) : "";
      const byEmail = await findUserIdByEmail(email || placeholder);
      const byPassport = await findUserIdByPassport(passport);
      if (byEmail && byPassport && byEmail.id !== byPassport.id) {
        fail(`Email and passport belong to two different accounts (#${byEmail.id} and #${byPassport.id}) -- check by hand`);
        continue;
      }
      // Same email but a different passport usually means two people sharing
      // one inbox -- never merge those automatically.
      if (byEmail && !byPassport && passport) {
        const [pp] = await pool.query<RowDataPacket[]>("SELECT passport_number FROM buyer_profiles WHERE user_id = ? LIMIT 1", [byEmail.id]);
        const existingPassport = normalizePassportNumber(str(pp[0]?.passport_number));
        if (existingPassport && existingPassport !== passport) {
          fail(`This email already belongs to account #${byEmail.id} with a different passport number -- check by hand`);
          continue;
        }
      }
      const existing = byEmail || byPassport;
      if (existing) {
        if (existing.role !== "buyer") { fail(`Already registered as a ${existing.role} account (#${existing.id}), not a buyer`); continue; }
        const added = await addBuyerExpoIds(existing.id, expoIds);
        const buyerNumber = await getBuyerNumber(existing.id);
        results.push({
          row, name, buyerNumber, loginId, password: null,
          status: added > 0 ? "expo_added" : "already_registered",
          reason: `Existing account ${buyerNumber || `#${existing.id}`}`,
        });
        continue;
      }

      if (password.length < 6) { fail("Password missing or shorter than 6 characters"); continue; }

      const { user: created } = await createUserAccount(name, email || placeholder, password, "buyer", str(input.country));
      const profile: Partial<BuyerProfileFields> = {};
      for (const key of PROFILE_KEYS) {
        const value = str(input[key]);
        if (value) profile[key] = value;
      }
      if (email) profile.contactEmail = email;
      if (phone) profile.phoneNumber = phone;
      if (passport) profile.passportNumber = passport;
      const wechat = str(input.wechatId);
      if (wechat) profile.wechatId = wechat;
      await upsertBuyerProfileFields(created.id, profile);
      await addBuyerExpoIds(created.id, expoIds);

      results.push({ row, name, buyerNumber: await getBuyerNumber(created.id), loginId, password, status: "created" });
    } catch (err) {
      console.error(`Buyer import failed for row ${row}:`, err);
      fail("Could not create account");
    }
  }

  const count = (s: ImportStatus) => results.filter((r) => r.status === s).length;
  logAdminAction(request, admin, "buyers_imported", { targetType: "user", details: `${count("created")} created, ${count("expo_added")} expo added, ${count("failed")} failed` });
  return NextResponse.json({
    results,
    created: count("created"),
    expoAdded: count("expo_added"),
    alreadyRegistered: count("already_registered"),
    failed: count("failed"),
  });
}
