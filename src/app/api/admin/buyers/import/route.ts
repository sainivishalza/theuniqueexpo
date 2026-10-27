import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/server/audit-log";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { requireAdmin, createUserAccount } from "@/lib/auth-server";
import { getBuyerNumber } from "@/lib/server/buyer-numbers";
import { getBuyerProfile, upsertBuyerProfileFields, type BuyerProfileFields } from "@/lib/server/buyer-profile-repo";
import { addBuyerExpoIds, findOrCreateExpoIds } from "@/lib/server/buyer-expos-repo";
import { normalizeLoginPhone, normalizePassportNumber, placeholderEmail } from "@/lib/login-id";
import {
  buyerNumberOf, compareProfile, emailTaken, findExistingBuyer, incomingProfile, COMPARE_FIELDS,
  type CompareField, type FieldChange, type MatchedBy,
} from "@/lib/server/buyer-import-plan";

// Imports buyers from a prepared file (built from expo spreadsheets). The same
// person is found by buyer number, passport number, phone number, WeChat ID, then
// email (see buyer-import-plan.ts) and is never created twice. For someone who is
// already registered the file only fills in what is still empty and adds the
// expos; a detail that is filled in and says something else is reported as a
// conflict and left alone unless the admin picked the new value for it.
// People with no email sign in with their phone or passport number (see
// verifyUserPassword) and get a placeholder email.
//
// mode "check" changes nothing and reports what apply would do. Send at most 40
// buyers per request: every new account costs a bcrypt hash.

const MAX_PER_REQUEST = 40;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ImportRow {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  wechatId?: unknown;
  passportNumber?: unknown;
  country?: unknown;
  password?: unknown;
  expos?: unknown;
  buyerNumber?: unknown;
  dateOfBirthApproximate?: unknown;
  // Fields where the admin chose the file's value over the one already saved.
  useNew?: unknown;
  [key: string]: unknown;
}

type ImportStatus = "created" | "expo_added" | "updated" | "already_registered" | "failed";

interface ImportResult {
  row: number;
  name: string;
  // The buyer's registration number (TUE0001) -- new or existing account.
  buyerNumber?: string;
  loginId: string;
  password: string | null;
  status: ImportStatus;
  reason?: string;
  matchedBy?: MatchedBy;
  // Details that were empty and are (or, in a check, would be) filled in.
  fills?: FieldChange[];
  // Details already saved that the file disagrees with.
  conflicts?: FieldChange[];
  // The conflicts the admin chose to overwrite.
  used?: string[];
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const isField = (v: string): v is CompareField => (COMPARE_FIELDS as readonly string[]).includes(v);

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const buyers = Array.isArray(body?.buyers) ? (body.buyers as ImportRow[]) : null;
  const check = body?.mode === "check";
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

      const expoNames = Array.isArray(input.expos) ? input.expos.map(str).filter(Boolean) : [];
      const identity = { email, phone, passport, wechat: str(input.wechatId), buyerNumber: buyerNumberOf(input.buyerNumber) };
      const incoming = incomingProfile(input, identity);
      const approximate = str(input.dateOfBirthApproximate) === "yes";
      const phonePlaceholder = phone ? placeholderEmail("phone", phone) : "";
      const passportPlaceholder = passport ? placeholderEmail("passport", passport) : "";

      const match = await findExistingBuyer(identity, { phone: phonePlaceholder, passport: passportPlaceholder });
      if (match.kind === "blocked") { fail(match.reason); continue; }

      if (match.kind === "found") {
        const existing = match.user;
        const [accounts] = await pool.query<RowDataPacket[]>("SELECT email FROM users WHERE id = ? LIMIT 1", [existing.id]);
        const current = await getBuyerProfile(existing.id);
        const { fills, conflicts } = compareProfile(current, incoming, approximate, str(accounts[0]?.email));
        const chosen = (Array.isArray(input.useNew) ? input.useNew.map(str) : []).filter(isField);
        const used = conflicts.filter((c) => chosen.includes(c.field as CompareField)).map((c) => c.field);

        let added = 0;
        if (!check) {
          const patch: Partial<BuyerProfileFields> = {};
          for (const change of [...fills, ...conflicts.filter((c) => used.includes(c.field))]) {
            (patch as Record<string, string>)[change.field] = change.incoming;
          }
          if (Object.keys(patch).length > 0) await upsertBuyerProfileFields(existing.id, patch);
          added = await addBuyerExpoIds(existing.id, await findOrCreateExpoIds(expoNames));
        } else {
          const known = new Set((current?.expoIds ?? []));
          const ids = expoNames.length ? await findOrCreateExpoIdsReadOnly(expoNames) : [];
          added = ids.filter((id) => !known.has(id)).length + (expoNames.length > ids.length ? 1 : 0);
        }
        const buyerNumber = await getBuyerNumber(existing.id);
        const changed = fills.length > 0 || used.length > 0;
        results.push({
          row, name, buyerNumber, loginId, password: null,
          status: changed ? "updated" : added > 0 ? "expo_added" : "already_registered",
          reason: `Existing account ${buyerNumber || `#${existing.id}`}`,
          matchedBy: match.by, fills, conflicts, used,
        });
        continue;
      }

      if (!email && !phone && !passport) { fail("No email, phone or passport number to sign in with"); continue; }
      if (password.length < 6) { fail("Password missing or shorter than 6 characters"); continue; }

      // Sign in with the email when it is free; an inbox another person already uses (a couple, a secretary) is kept as a contact
      // email only. A phone number another person already has is not a way to sign in either: the passport number is.
      const phoneShared = match.rejected.some((r) => r.startsWith("phone:"));
      let accountEmail = "";
      for (const candidate of [email, phoneShared ? "" : phonePlaceholder, passportPlaceholder]) {
        if (candidate && !(await emailTaken(candidate))) { accountEmail = candidate; break; }
      }
      if (!accountEmail) { fail("Every way to sign in for this person is already used by another account -- check by hand"); continue; }
      const signInWith = accountEmail === email ? email : accountEmail === phonePlaceholder ? phone : passport;

      if (check) {
        results.push({ row, name, loginId: signInWith, password: null, status: "created", fills: [], conflicts: [] });
        continue;
      }

      const expoIds = await findOrCreateExpoIds(expoNames);
      const { user: created } = await createUserAccount(name, accountEmail, password, "buyer", str(input.country));
      await upsertBuyerProfileFields(created.id, incoming);
      await addBuyerExpoIds(created.id, expoIds);

      results.push({ row, name, buyerNumber: await getBuyerNumber(created.id), loginId: signInWith, password, status: "created" });
    } catch (err) {
      console.error(`Buyer import failed for row ${row}:`, err);
      fail("Could not create account");
    }
  }

  const count = (s: ImportStatus) => results.filter((r) => r.status === s).length;
  if (!check) {
    logAdminAction(request, admin, "buyers_imported", {
      targetType: "user",
      details: `${count("created")} created, ${count("updated")} updated, ${count("expo_added")} expo added, ${count("failed")} failed`,
    });
  }
  return NextResponse.json({
    results,
    check,
    created: count("created"),
    updated: count("updated"),
    expoAdded: count("expo_added"),
    alreadyRegistered: count("already_registered"),
    failed: count("failed"),
  });
}

// A check must not create expos. Looks the names up and leaves the ones that do not exist yet out.
async function findOrCreateExpoIdsReadOnly(names: string[]): Promise<number[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM buyer_expos WHERE name IN (${names.map(() => "?").join(",")})`,
    names
  );
  return rows.map((r) => Number(r.id));
}
