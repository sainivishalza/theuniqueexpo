import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { normalizeLoginPhone, normalizePassportNumber } from "@/lib/login-id";
import { BUYER_NUMBER_RE } from "./buyer-row-doctor";
import type { BuyerProfileFields } from "./buyer-profile-repo";

// Works out, for one row of an import file, who the person is and what the file
// would change about them -- without writing anything. The import route uses it
// both to preview (check) and to save (apply), so the two can never disagree.
//
// Who is it: our own buyer number, then passport number, phone number, WeChat ID,
// email -- the first one that finds somebody. A match is thrown away when both
// sides have a passport number and they differ: two people can share a phone, a
// WeChat or an inbox (a couple, a secretary), a passport belongs to one person.
//
// What changes: a detail the buyer has not filled in is filled from the file. A
// detail that is already filled and says something else is a conflict -- never
// changed unless the admin chooses the new value.

export type MatchedBy = "buyerNumber" | "passport" | "phone" | "wechat" | "email";

export interface FieldChange {
  field: string;
  current: string;
  incoming: string;
}

export interface Candidate {
  id: number;
  role: string;
  passport: string;
}

export interface RowIdentity {
  email: string;
  phone: string;
  passport: string;
  wechat: string;
  buyerNumber: number;
}

export type Match =
  | { kind: "none"; rejected: string[] }
  | { kind: "found"; user: Candidate; by: MatchedBy }
  | { kind: "blocked"; reason: string };

const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

// The profile fields a file row can carry, in the order they are listed to the admin.
export const COMPARE_FIELDS = [
  "passportNumber", "passportName", "phoneNumber", "wechatId", "contactEmail", "gender", "dateOfBirth", "nationality",
  "companyName", "jobTitle", "visaType", "visaExpireDate", "passportExpireDate", "purchaseIntention", "otherPurchaseIntention",
  "annualTurnover", "contactPerson", "departureCity", "attendanceDay", "meetingOrVisiting", "overseasCompanyAddress", "companyField",
] as const satisfies readonly (keyof BuyerProfileFields)[];
export type CompareField = (typeof COMPARE_FIELDS)[number];

export function buyerNumberOf(value: unknown): number {
  const text = str(value).toUpperCase();
  if (!BUYER_NUMBER_RE.test(text)) return 0;
  return Number(text.replace(/\D/g, "")) || 0;
}

// What the file says about this person, as profile fields (empty ones left out).
export function incomingProfile(input: Record<string, unknown>, identity: RowIdentity): Partial<BuyerProfileFields> {
  const out: Partial<BuyerProfileFields> = {};
  const set = (key: CompareField, value: string) => { if (value) out[key] = value; };
  for (const key of COMPARE_FIELDS) {
    if (key === "passportNumber" || key === "phoneNumber" || key === "wechatId" || key === "contactEmail") continue;
    set(key, str(input[key]));
  }
  set("passportNumber", identity.passport);
  set("phoneNumber", identity.phone);
  set("wechatId", identity.wechat);
  set("contactEmail", identity.email);
  return out;
}

const simple = (v: string) => v.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

// Do these two values say the same thing? Spelling, case, spacing and punctuation
// do not matter; a longer text that contains the shorter one counts as the same
// (a visa written "Work or Business Visa" against "Work Visa").
export function sameValue(field: CompareField, a: string, b: string, approximateDate: boolean): boolean {
  if (field === "passportNumber") return normalizePassportNumber(a) === normalizePassportNumber(b);
  if (field === "phoneNumber") return normalizeLoginPhone(a) === normalizeLoginPhone(b);
  if (field === "contactEmail") return a.trim().toLowerCase() === b.trim().toLowerCase();
  if (field === "dateOfBirth" || field === "visaExpireDate" || field === "passportExpireDate") {
    const x = DATE_RE.exec(a.trim());
    const y = DATE_RE.exec(b.trim());
    if (x && y) {
      if (x[1] !== y[1] || x[2] !== y[2]) return false;
      return approximateDate || x[3] === y[3];
    }
  }
  const x = simple(a);
  const y = simple(b);
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 4 && long.includes(short);
}

// An approximate birth date stored with day 01 is made exact when the file now has the exact one for the same month.
function refinesDate(field: CompareField, current: string, incoming: string, approximateIncoming: boolean): boolean {
  if (field !== "dateOfBirth" || approximateIncoming) return false;
  const x = DATE_RE.exec(current.trim());
  const y = DATE_RE.exec(incoming.trim());
  return !!x && !!y && x[3] === "01" && y[3] !== "01" && x[1] === y[1] && x[2] === y[2];
}

export function compareProfile(
  current: Partial<BuyerProfileFields> | null,
  incoming: Partial<BuyerProfileFields>,
  approximateDate: boolean,
  accountEmail: string
): { fills: FieldChange[]; conflicts: FieldChange[] } {
  const fills: FieldChange[] = [];
  const conflicts: FieldChange[] = [];
  for (const field of COMPARE_FIELDS) {
    const next = incoming[field] ?? "";
    if (!next) continue;
    const now = str(current?.[field]);
    // The sign-in email counts as the contact email: nothing to add when the file only repeats it.
    if (field === "contactEmail" && accountEmail && accountEmail.toLowerCase() === next.toLowerCase()) continue;
    if (!now) fills.push({ field, current: "", incoming: next });
    else if (refinesDate(field, now, next, approximateDate)) fills.push({ field, current: now, incoming: next });
    else if (!sameValue(field, now, next, approximateDate)) conflicts.push({ field, current: now, incoming: next });
  }
  return { fills, conflicts };
}

async function candidatesBy(sql: string, params: unknown[]): Promise<Candidate[]> {
  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  const ids = new Map<number, Candidate>();
  for (const row of rows) ids.set(row.id, { id: row.id, role: row.role, passport: "" });
  if (ids.size === 0) return [];
  const [passports] = await pool.query<RowDataPacket[]>(
    `SELECT user_id, passport_number FROM buyer_profiles WHERE user_id IN (${[...ids.keys()].map(() => "?").join(",")})`,
    [...ids.keys()]
  );
  for (const p of passports) {
    const c = ids.get(p.user_id);
    if (c) c.passport = normalizePassportNumber(str(p.passport_number));
  }
  return [...ids.values()];
}

const PASSPORT_SQL = "UPPER(REPLACE(REPLACE(REPLACE(p.passport_number, ' ', ''), '-', ''), '.', ''))";
const PHONE_SQL = "REGEXP_REPLACE(p.phone_number, '[^0-9]', '')";

// Finds the one existing account this row is about (see the top of the file for the order and the passport guard).
export async function findExistingBuyer(identity: RowIdentity, placeholders: { phone: string; passport: string }): Promise<Match> {
  const rejected: string[] = [];
  const steps: { by: MatchedBy; run: () => Promise<Candidate[]> }[] = [];
  if (identity.buyerNumber) {
    steps.push({ by: "buyerNumber", run: () => candidatesBy("SELECT id, role FROM users WHERE buyer_no = ? LIMIT 2", [identity.buyerNumber]) });
  }
  if (identity.passport) {
    steps.push({
      by: "passport",
      run: () => candidatesBy(
        `SELECT u.id, u.role FROM buyer_profiles p JOIN users u ON u.id = p.user_id WHERE ${PASSPORT_SQL} = ? ORDER BY u.id LIMIT 5`,
        [identity.passport]
      ),
    });
  }
  if (identity.phone) {
    steps.push({
      by: "phone",
      run: () => candidatesBy(
        `SELECT DISTINCT u.id, u.role FROM users u LEFT JOIN buyer_profiles p ON p.user_id = u.id
         WHERE ${PHONE_SQL} IN (?, ?) OR u.email = ? ORDER BY u.id LIMIT 5`,
        [identity.phone, `86${identity.phone}`, placeholders.phone]
      ),
    });
  }
  if (identity.wechat.length >= 4) {
    steps.push({
      by: "wechat",
      run: () => candidatesBy(
        "SELECT u.id, u.role FROM buyer_profiles p JOIN users u ON u.id = p.user_id WHERE LOWER(TRIM(p.wechat_id)) = ? ORDER BY u.id LIMIT 5",
        [identity.wechat.toLowerCase()]
      ),
    });
  }
  if (identity.email) {
    steps.push({
      by: "email",
      run: () => candidatesBy(
        `SELECT DISTINCT u.id, u.role FROM users u LEFT JOIN buyer_profiles p ON p.user_id = u.id
         WHERE u.email = ? OR LOWER(TRIM(p.contact_email)) = ? ORDER BY u.id LIMIT 5`,
        [identity.email, identity.email]
      ),
    });
  }

  for (const step of steps) {
    const found = await step.run();
    const accepted = found.filter((c) => !(identity.passport && c.passport && c.passport !== identity.passport));
    for (const c of found) {
      if (!accepted.includes(c)) rejected.push(`${step.by}: account #${c.id} has a different passport number`);
    }
    if (accepted.length === 0) {
      // Our own number is certain: if it points at somebody with another passport, stop rather than carry on guessing.
      if (step.by === "buyerNumber" && found.length > 0) return { kind: "blocked", reason: "This buyer number belongs to someone with a different passport number -- check by hand" };
      continue;
    }
    if (accepted.length > 1) return { kind: "blocked", reason: `${step.by} matches ${accepted.length} different accounts (${accepted.map((c) => `#${c.id}`).join(", ")}) -- check by hand` };
    const user = accepted[0];
    if (user.role !== "buyer") return { kind: "blocked", reason: `Already registered as a ${user.role} account (#${user.id}), not a buyer` };
    return { kind: "found", user, by: step.by };
  }
  return { kind: "none", rejected };
}

export async function emailTaken(email: string): Promise<boolean> {
  if (!email) return false;
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  return rows.length > 0;
}
