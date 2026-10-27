import { readXlsxRaw, type RawSheet } from "./xlsx-raw";
import { BUYER_NUMBER_RE, parseBirth, repairShiftedRow } from "./buyer-row-doctor";
import { NATIONALITIES } from "@/lib/expo-registrations";

// Turns expo spreadsheets (many sheets, many layouts, the same person repeated
// across sheets) into one clean list of buyers to import.
//
// Rules, as agreed with the site owner:
//  - One account per person. People are matched by passport number first, then
//    by email; a phone number only counts when the names are also alike.
//  - When two rows look like the same person but their details disagree (for
//    example the passport number is typed two ways) nothing is guessed: they go
//    on a "check by hand" list and are not imported.
//  - Someone with no email, phone or passport number cannot sign in, so is not
//    imported (listed instead).
//  - Password: phone number (digits only; China mobile preferred), else WeChat
//    ID, else passport number.
//  - Rows with only a name are attached to a person with exactly the same name.
//  - Money columns (subsidy, paid, profit ...) are never read.
// Nothing here touches the database.

export interface ImportBuyer {
  name: string;
  email?: string;
  phone?: string;
  wechatId?: string;
  passportNumber?: string;
  passportName?: string;
  password: string;
  country?: string;
  nationality?: string;
  gender?: string;
  companyName?: string;
  jobTitle?: string;
  departureCity?: string;
  companyField?: string;
  overseasCompanyAddress?: string;
  attendanceDay?: string;
  meetingOrVisiting?: string;
  visaType?: string;
  purchaseIntention?: string;
  // Our own buyer number (TUE0166) when the sheet carries it: the surest way to find the account.
  buyerNumber?: string;
  // ISO date. When the sheet had only the year and month the day is 1 and dateOfBirthApproximate is "yes".
  dateOfBirth?: string;
  dateOfBirthApproximate?: string;
  expos: string[];
}

export interface SheetSummary {
  sheet: string;
  expo: string;
  hidden: boolean;
  rows: number;
  layout: string; // "known layout" or the columns that were recognised
}

export interface HeldRow {
  group: number;
  person: string;
  sheet: string;
  expo: string;
  name: string;
  passport: string;
  email: string;
  phone: string;
  company: string;
}

export interface SkippedPerson {
  name: string;
  expos: string[];
  sheets: string[];
  passport: string;
  email: string;
  phone: string;
  why: string;
}

export interface NameOnlyMatch {
  name: string;
  sheet: string;
  expo: string;
  matchedPerson: string;
  passport: string;
}

// A row that sat in a different column order than the header says and was read by the look of its values instead.
export interface RepairedRow {
  sheet: string;
  row: number;
  buyerNumber: string;
  name: string;
  passport: string;
  phone: string;
  email: string;
}

export interface ParseResult {
  buyers: ImportBuyer[];
  repaired: RepairedRow[];
  held: HeldRow[];
  heldPeople: number;
  skipped: SkippedPerson[];
  nameOnlyMatches: NameOnlyMatch[];
  sheets: SheetSummary[];
  totalRows: number;
  loginBy: { email: number; phone: number; passport: number };
}

type Field =
  | "gender" | "passport" | "country" | "city" | "job" | "company" | "email" | "nationality" | "visa" | "attendday"
  | "phone" | "wechat" | "birth" | "products" | "field" | "address" | "meeting" | "buyerno";

interface Rec {
  sheet: string;
  expo: string;
  name: string;
  f: Partial<Record<Field, string>>;
  p: string; // normalised passport
  ph: string; // normalised phone
  wcph: string; // WeChat value, when it is really a phone number
  e: string; // normalised email
}

// ---------- sheet name -> expo name ----------
// Known sheets of the original workbook keep exactly the names agreed earlier;
// any other sheet becomes an expo named after the sheet. Expos can be renamed
// later in Admin -> Buyer Expos.
const EXPO_BY_SHEET: Record<string, string> = {
  "DG 6-9Aug": "DG 6-9 Aug",
  "SZ 20-21 Aug": "SZ 20-21 Aug",
  "SZ 26-27Aug": "SZ 26-27 Aug (Toys)",
  Propak: "ProPak Shenzhen",
  CPHI: "CPHI",
  shengfang: "Shengfang Furniture Fair",
  Nanning: "CAEXPO Nanning",
  "HK11.10": "Global Sources Hong Kong",
  Hotelx: "HOTELEX Shenzhen",
  TCT: "TCT Shenzhen",
  "14.10 Gz": "Guangzhou Sourcing Fair",
  GSF: "Guangzhou Sourcing Fair",
  "F&L": "GZ Fashion & Lifestyle",
  MIF: "Macao MIF",
  "16.10 shangdong": "Shandong 16 Oct",
  "winb16.10": "WinB 16 Oct",
  "23.10 GZ-MM": "Guangzhou 23 Oct",
  Taizhou: "Taizhou Expo",
  Zhongshan: "Zhongshan Expo",
};

// Sheets whose name column is the name printed on the passport.
const PASSPORT_NAME_SHEETS = new Set(["Propak", "Propak (2)", "CPHI", "CPHI 17-18", "SZ 26-27Aug", "SZ Toys Payment", "winb16.10", "23.10 GZ-MM"]);

export function prettyExpoName(sheetName: string): string {
  let n = sheetName.replace(/[（(][^）)]*[）)]/g, " ").replace(/\s+/g, " ").trim();
  if (!/\s/.test(n)) {
    n = n
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/([A-Za-z])(\d)/g, "$1 $2")
      .replace(/(\d)([A-Za-z])/g, "$1 $2");
  }
  return n.replace(/\s+/g, " ").trim() || sheetName.trim();
}

// ---------- normalisers ----------
function normPass(p: unknown): string {
  const v = String(p ?? "").replace(/[\s\-.]/g, "").toUpperCase();
  return v.length >= 6 && /^[A-Z0-9]+$/.test(v) ? v : "";
}
function normPhone(p: unknown): string {
  let d = String(p ?? "").replace(/\D/g, "");
  if (d.startsWith("0086") && d.length > 11) d = d.slice(4);
  else if (d.startsWith("86") && d.length === 13) d = d.slice(2);
  return d.length >= 8 ? d : "";
}
function normEmail(e: unknown): string {
  const v = String(e ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : "";
}
function nameTokens(n: string): string[] {
  return (String(n).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).sort();
}
function nameKey(n: string): string {
  return nameTokens(n).join(" ");
}

// Same measure as Python's difflib.SequenceMatcher(None, a, b).ratio(), which
// the matching rules were tuned with.
function similarity(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (la + lb === 0) return 1;
  const b2j = new Map<string, number[]>();
  for (let j = 0; j < lb; j++) {
    const list = b2j.get(b[j]);
    if (list) list.push(j);
    else b2j.set(b[j], [j]);
  }
  function longest(alo: number, ahi: number, blo: number, bhi: number): [number, number, number] {
    let besti = alo;
    let bestj = blo;
    let bestsize = 0;
    let j2len = new Map<number, number>();
    for (let i = alo; i < ahi; i++) {
      const newj2len = new Map<number, number>();
      for (const j of b2j.get(a[i]) ?? []) {
        if (j < blo) continue;
        if (j >= bhi) break;
        const k = (j2len.get(j - 1) ?? 0) + 1;
        newj2len.set(j, k);
        if (k > bestsize) {
          besti = i - k + 1;
          bestj = j - k + 1;
          bestsize = k;
        }
      }
      j2len = newj2len;
    }
    return [besti, bestj, bestsize];
  }
  let matches = 0;
  const queue: [number, number, number, number][] = [[0, la, 0, lb]];
  while (queue.length) {
    const [alo, ahi, blo, bhi] = queue.pop()!;
    const [i, j, k] = longest(alo, ahi, blo, bhi);
    if (k) {
      matches += k;
      if (alo < i && blo < j) queue.push([alo, i, blo, j]);
      if (i + k < ahi && j + k < bhi) queue.push([i + k, ahi, j + k, bhi]);
    }
  }
  return (2 * matches) / (la + lb);
}

function passEq(a: string, b: string): boolean {
  if (a === b) return true;
  const na = a.replace(/^0+/, "");
  const nb = b.replace(/^0+/, "");
  return na === nb && /^\d+$/.test(a) && /^\d+$/.test(b);
}

function cleanText(s: string): string {
  return s.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

// ---------- reading sheets into records ----------
type Row = Map<number, string>;
interface SheetRow {
  n: number;
  d: Row;
}

function sheetRows(sheet: RawSheet, headerRows = 1): SheetRow[] {
  const out: SheetRow[] = [];
  for (const n of [...sheet.rows.keys()].sort((a, b) => a - b)) {
    if (n <= headerRows) continue;
    const d: Row = new Map();
    for (const [c, v] of sheet.rows.get(n)!) d.set(c, String(v).trim());
    out.push({ n, d });
  }
  return out;
}
const g = (d: Row, c: number) => (d.get(c) ?? "").trim();

const HEADER_NAME_RE = /^(.*full name|name|buyer.?s? name|full name|contact name|passport name|nan|no\.?|sr\.? no|buyer|passport)$/i;

class Collector {
  recs: Rec[] = [];
  repaired: RepairedRow[] = [];
  add(sheet: string, expo: string, name: string, fields: Partial<Record<Field, string>>) {
    const f: Partial<Record<Field, string>> = {};
    for (const [k, v] of Object.entries(fields)) if (v !== undefined) f[k as Field] = cleanText(v);
    const nm = cleanText(name);
    if (!nm) return;
    const wc = (f.wechat ?? "").trim();
    const rec: Rec = {
      sheet,
      expo,
      name: nm,
      f,
      p: normPass(f.passport),
      ph: normPhone(f.phone),
      wcph: /^[\d\s()+\-]+$/.test(wc || "x") ? normPhone(wc) : "",
      e: normEmail(f.email),
    };
    // A repeated header row ("Buyer Name", "Passport" ...) has no real number or email in it; a person
    // who really typed "Passport" as their name does, so is kept.
    if (HEADER_NAME_RE.test(nm) && !(rec.p || rec.ph || rec.wcph || rec.e)) return;
    this.recs.push(rec);
  }
}

// The 27 sheets of the original workbook, in the order they are read.
const KNOWN_ORDER = [
  "SZ 20-21 Aug", "SZ 20-21 Aug paid", "SZ 20-21Aug", "SZ 26-27Aug", "SZ Toys Payment", "Propak", "Propak (2)",
  "CPHI", "CPHI 17-18", "shengfang", "Nanning", "Nanning Payt", "Nanning Payt (2)", "HK11.10", "Hotelx", "TCT",
  "14.10 Gz", "16.10 shangdong", "winb16.10", "GSF", "F&L", "MIF", "23.10 GZ-MM", "Taizhou", "Zhongshan", "DG 6-9Aug",
];
const IGNORED_SHEETS = new Set(["EXpo_bonus"]);

function extractKnown(sheet: RawSheet, c: Collector): number {
  const before = c.recs.length;
  const nm = sheet.name;
  const expo = (label: string) => EXPO_BY_SHEET[label] ?? "";
  switch (nm) {
    case "SZ 20-21 Aug":
      for (const { d } of sheetRows(sheet))
        c.add(nm, expo(nm), g(d, 8), { gender: g(d, 9), passport: g(d, 10), country: g(d, 7), city: g(d, 6), job: g(d, 11), company: g(d, 12), email: g(d, 14) });
      break;
    case "SZ 20-21 Aug paid":
      for (const { d } of sheetRows(sheet))
        c.add(nm, expo("SZ 20-21 Aug"), g(d, 8), { gender: g(d, 9), passport: g(d, 10), country: g(d, 7), city: g(d, 6) });
      break;
    case "SZ 20-21Aug":
      for (const { d } of sheetRows(sheet))
        c.add(nm, expo("SZ 20-21 Aug"), g(d, 14) || g(d, 2), { gender: g(d, 15), passport: g(d, 16) || g(d, 3), country: g(d, 13), nationality: g(d, 4), visa: g(d, 5) });
      break;
    case "SZ 26-27Aug":
      for (const { d } of sheetRows(sheet)) c.add(nm, expo("SZ 26-27Aug"), g(d, 10), { passport: g(d, 11), visa: g(d, 13), attendday: g(d, 9) });
      break;
    case "SZ Toys Payment":
      for (const { d } of sheetRows(sheet)) c.add(nm, expo("SZ 26-27Aug"), g(d, 2), { passport: g(d, 3), visa: g(d, 5) });
      break;
    case "Propak":
    case "Propak (2)": {
      // First table = the registration form; a second table starts at the row whose first cell is "NO.".
      let split: number | null = null;
      for (const n of [...sheet.rows.keys()].sort((a, b) => a - b)) if (String(sheet.rows.get(n)!.get(1) ?? "").trim() === "NO.") split = n;
      for (const { n, d } of sheetRows(sheet)) {
        if (split !== null && n >= split) {
          if (n === split) continue;
          c.add(nm, expo("Propak"), g(d, 5), { city: g(d, 3), country: g(d, 4), passport: g(d, 6), gender: g(d, 7), birth: g(d, 8), company: g(d, 9), job: g(d, 10), products: g(d, 11), field: g(d, 12) });
        } else {
          c.add(nm, expo("Propak"), g(d, 2), { passport: g(d, 3), wechat: g(d, 4), phone: g(d, 5), email: g(d, 6), gender: g(d, 7), birth: g(d, 8), nationality: g(d, 9), company: g(d, 10), job: g(d, 11), visa: g(d, 12) });
        }
      }
      break;
    }
    case "CPHI":
      for (const { d } of sheetRows(sheet))
        c.add(nm, expo("CPHI"), g(d, 6), { city: g(d, 3), attendday: g(d, 4), meeting: g(d, 5), passport: g(d, 7), gender: g(d, 8), wechat: g(d, 9), company: g(d, 10), address: g(d, 11), field: g(d, 12), job: g(d, 13), email: g(d, 14) });
      break;
    case "CPHI 17-18":
      for (const { d } of sheetRows(sheet))
        c.add(nm, expo("CPHI"), g(d, 3), { city: g(d, 2), passport: g(d, 7), gender: g(d, 8), wechat: g(d, 9), company: g(d, 10), address: g(d, 11), field: g(d, 12), job: g(d, 13), email: g(d, 14) });
      break;
    case "shengfang":
      for (const { d } of sheetRows(sheet, 0)) {
        if (!g(d, 4)) continue;
        c.add(nm, expo("shengfang"), g(d, 4), { passport: g(d, 5), phone: g(d, 2) || g(d, 3), city: g(d, 9) });
      }
      break;
    case "Nanning":
      for (const { d } of sheetRows(sheet)) {
        if (g(d, 2)) c.add("Nanning", expo("Nanning"), g(d, 2), { passport: g(d, 3), phone: g(d, 4) });
        if (g(d, 9)) c.add("Nanning (list 2)", expo("Nanning"), g(d, 9), { gender: g(d, 12), phone: g(d, 13), nationality: g(d, 14), city: g(d, 15) });
      }
      break;
    case "Nanning Payt":
    case "Nanning Payt (2)":
      for (const { d } of sheetRows(sheet)) c.add(nm, expo("Nanning"), g(d, 3), { gender: g(d, 5), phone: g(d, 6), nationality: g(d, 7), city: g(d, 8) });
      break;
    case "HK11.10":
      for (const { d } of sheetRows(sheet))
        c.add(nm, expo(nm), `${g(d, 6)} ${g(d, 7)}`.trim(), { email: g(d, 8), company: g(d, 4), country: g(d, 12) });
      break;
    case "Hotelx":
      for (const { d } of sheetRows(sheet, 2)) c.add(nm, expo(nm), g(d, 2), { country: g(d, 3), passport: g(d, 4), company: g(d, 5), job: g(d, 6), field: g(d, 7), products: g(d, 8) });
      break;
    case "TCT":
      for (const { d } of sheetRows(sheet))
        c.add(nm, expo(nm), g(d, 5), { city: g(d, 3), country: g(d, 4), gender: g(d, 6), passport: g(d, 7), job: g(d, 8), company: g(d, 9), products: g(d, 10), phone: g(d, 11), email: g(d, 12) });
      break;
    case "14.10 Gz":
      for (const { d } of sheetRows(sheet, 2)) c.add(nm, expo(nm), g(d, 3), { visa: g(d, 2), gender: g(d, 4), nationality: g(d, 5) });
      break;
    case "16.10 shangdong":
      for (const { d } of sheetRows(sheet)) c.add(nm, expo(nm), g(d, 2), {});
      break;
    case "winb16.10":
      for (const { d } of sheetRows(sheet))
        c.add(nm, expo(nm), g(d, 2), { passport: g(d, 3), visa: g(d, 4), phone: g(d, 5), wechat: g(d, 6), email: g(d, 7), gender: g(d, 8), birth: g(d, 9), nationality: g(d, 10), company: g(d, 11), job: g(d, 12), field: g(d, 14) });
      break;
    case "GSF":
      for (const { d } of sheetRows(sheet, 2)) {
        if (g(d, 2)) c.add("GSF", expo("GSF"), g(d, 2), { nationality: g(d, 3), gender: g(d, 4), company: g(d, 5) });
        if (g(d, 11)) c.add("GSF (matchmaking)", expo("GSF"), g(d, 11), { nationality: g(d, 12), company: g(d, 10) });
      }
      break;
    case "F&L":
      for (const { d } of sheetRows(sheet, 2)) c.add(nm, expo(nm), g(d, 3), { company: g(d, 2), gender: g(d, 4), nationality: g(d, 5), phone: g(d, 6) });
      break;
    case "MIF":
      for (const { d } of sheetRows(sheet)) c.add(nm, expo(nm), g(d, 2), { passport: g(d, 4), phone: g(d, 5) });
      break;
    case "23.10 GZ-MM":
      for (const { d } of sheetRows(sheet))
        c.add(nm, expo(nm), g(d, 6), { passport: g(d, 7), nationality: g(d, 8), city: g(d, 11), email: g(d, 12), phone: g(d, 13), company: g(d, 14), job: g(d, 15), products: g(d, 18), visa: g(d, 4) });
      break;
    case "Taizhou":
      for (const { d } of sheetRows(sheet, 3)) c.add(nm, expo(nm), g(d, 3), {});
      break;
    case "Zhongshan":
      for (const { d } of sheetRows(sheet)) c.add(nm, expo(nm), g(d, 5), { country: g(d, 3), company: g(d, 4), email: g(d, 6), passport: g(d, 7), products: g(d, 10) });
      break;
    case "DG 6-9Aug":
      for (const { d } of sheetRows(sheet)) c.add(nm, expo(nm), g(d, 2), {});
      break;
  }
  return c.recs.length - before;
}

// ---------- sheets the program has not seen before ----------
// Column meaning is read from the header row (English or Chinese labels).
type GenericField = "name" | "passportName" | Field;
const SKIP_HEADER_RE = /picture|image|photo|licen[cs]e|badge|business card|\bcard\b|submit|提交|attachment|proof|profile|序号|s\.? ?no|^no\.?$|^#$/i;
const GENERIC_RULES: [GenericField, RegExp][] = [
  ["passportName", /passport.*name|name.*passport|full name|^name$|^buyer.?s? name|contact name|姓名/],
  ["passport", /passport|护照/],
  ["wechat", /we ?chat|weixin|微信/],
  ["phone", /phone|mobile|\btel\b|telephone|手机|电话/],
  ["email", /e-?mail|邮箱/],
  ["gender", /gender|\bsex\b|性别/],
  ["birth", /birth|生日/],
  ["nationality", /nationality|citizen|国籍/],
  ["country", /^country|nation/],
  ["city", /city|departure|城市/],
  ["address", /address|地址/],
  ["field", /field|business nature|main business|industry|category/],
  ["job", /position|title|\bjob\b|职位/],
  ["company", /company|公司/],
  ["visa", /visa|签证/],
  ["products", /product|procurement|purchase|interest|desired/],
  ["meeting", /meeting|visiting/],
  ["attendday", /attendance|attend/],
];
function headerLabel(v: string): string {
  return v.replace(/[（(][^）)]*[）)]/g, " ").replace(/[*:：]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function extractGeneric(sheet: RawSheet, c: Collector): { count: number; layout: string; passportName: boolean } {
  // Header = the first row (of the top 15) with the most recognisable labels.
  let headerRow = 0;
  let best = 0;
  for (const n of [...sheet.rows.keys()].sort((a, b) => a - b).slice(0, 15)) {
    let hits = 0;
    for (const v of sheet.rows.get(n)!.values()) {
      const label = headerLabel(String(v));
      if (!label || SKIP_HEADER_RE.test(label)) continue;
      if (GENERIC_RULES.some(([, re]) => re.test(label))) hits++;
    }
    if (hits > best) {
      best = hits;
      headerRow = n;
    }
  }
  if (best < 2) return { count: 0, layout: "no recognisable header row", passportName: false };

  const columns = new Map<GenericField, number>();
  const strongPassportName = new Set<number>();
  for (const [col, v] of sheet.rows.get(headerRow)!) {
    const label = headerLabel(String(v));
    if (!label || SKIP_HEADER_RE.test(label)) continue;
    const rule = GENERIC_RULES.find(([, re]) => re.test(label));
    if (!rule) continue;
    const field = rule[0];
    if (field === "passportName" && /passport/.test(label)) strongPassportName.add(col);
    const existing = columns.get(field);
    if (existing === undefined || (field === "passportName" && strongPassportName.has(col) && !strongPassportName.has(existing))) columns.set(field, col);
  }
  const nameCol = columns.get("passportName");
  if (nameCol === undefined) return { count: 0, layout: "no name column found", passportName: false };

  const expo = prettyExpoName(sheet.name);
  const before = c.recs.length;
  const passportCol = columns.get("passport");
  const lastCol = Math.max(...columns.values());
  for (const { n, d } of sheetRows(sheet, headerRow)) {
    // A row in a different column order than the header says (our own buyer number first, everything else pushed one place
    // right) is read by the look of its values; every such row is listed so it can be checked.
    if (BUYER_NUMBER_RE.test(g(d, nameCol)) || (passportCol !== undefined && BUYER_NUMBER_RE.test(g(d, passportCol)))) {
      const cells = [...d.entries()].filter(([col, v]) => col >= nameCol && col <= lastCol && !/\.(png|jpe?g|webp|gif|heic)$/i.test(v)).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
      const fixed = repairShiftedRow(cells, isKnownNationality);
      if (fixed && fixed.name) {
        c.repaired.push({ sheet: sheet.name, row: n, buyerNumber: fixed.buyerNumber, name: fixed.name, passport: fixed.passport, phone: fixed.phone, email: fixed.email });
        c.add(sheet.name, expo, fixed.name, {
          passport: fixed.passport, phone: fixed.phone, wechat: fixed.wechat, email: fixed.email, gender: fixed.gender, birth: fixed.birth,
          nationality: fixed.nationality, visa: fixed.visa, company: fixed.company, job: fixed.job, buyerno: fixed.buyerNumber,
        });
        continue;
      }
    }
    const fields: Partial<Record<Field, string>> = {};
    for (const [field, col] of columns) {
      if (field === "passportName") continue;
      fields[field as Field] = g(d, col);
    }
    c.add(sheet.name, expo, g(d, nameCol), fields);
  }
  const used = [...columns.keys()].map((k) => (k === "passportName" ? "name" : k)).join(", ");
  return { count: c.recs.length - before, layout: `columns: ${used}`, passportName: strongPassportName.has(nameCol) };
}

// ---------- merging people ----------
const CONTINENT_PREFIXES = ["asia ", "europe ", "africa ", "north america ", "south america ", "oceania "];
const NATIONALITY_FIX: Record<string, string> = {
  nepalese: "Nepal", belarussian: "Belarus", ukrain: "Ukraine", rus: "Russia", turkeminstan: "Turkmenistan", venzuela: "Venezuela",
  mongol: "Mongolia", malawian: "Malawi", brasileiro: "Brazil", ivorian: "Ivory Coast", "ivory cost national": "Ivory Coast",
  "the united states": "United States", "americas bolivia": "Bolivia", russian: "Russia", "russian federation": "Russia",
  pakistani: "Pakistan", brazilian: "Brazil", brasil: "Brazil", indian: "India", afghan: "Afghanistan", egyptian: "Egypt",
  iranian: "Iran", ukrainian: "Ukraine", kazakh: "Kazakhstan", bangladeshi: "Bangladesh", "türkiye": "Turkey", turkiye: "Turkey",
  belarusian: "Belarus", moroccan: "Morocco", turkish: "Turkey", uzbek: "Uzbekistan",
};
const CITY_FIX: Record<string, string> = { 北京: "Beijing", 广州: "Guangzhou", 深圳: "Shenzhen", 上海: "Shanghai", 香港: "Hong Kong", sz: "Shenzhen", gz: "Guangzhou", GZ: "Guangzhou", SZ: "Shenzhen" };
const CITY_OK: Record<string, string> = {
  guangzhou: "Guangzhou", guanzhou: "Guangzhou", shenzhen: "Shenzhen", beijing: "Beijing", foshan: "Foshan", irkutsk: "Irkutsk",
  dongxing: "Dongxing", ningbo: "Ningbo", shanghai: "Shanghai", "hong kong": "Hong Kong",
};
const VISA_FIX: Record<string, string> = {
  私人事务: "Private affairs visa", 商务签: "Business visa", 私人事务签: "Private affairs visa", 免签: "Visa-free", 团聚: "Family reunion visa",
  Work: "Work visa", Business: "Business visa", Student: "Student visa", "Other non-Student visa": "Other non-Student visa",
  "Other Non-student visa": "Other non-Student visa", "Other non-student": "Other non-Student visa",
};

const isLower = (s: string) => s === s.toLowerCase() && s !== s.toUpperCase();
const isUpper = (s: string) => s === s.toUpperCase() && s !== s.toLowerCase();
const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);
function titleName(n: string): string {
  return n.replace(/\s+/g, " ").trim().split(" ").map((t) => (isLower(t) ? capitalize(t) : t)).join(" ");
}
function nationality(v: string): string {
  let s = v.replace(/\s+/g, " ").trim();
  let low = s.toLowerCase();
  for (const prefix of CONTINENT_PREFIXES) {
    if (low.startsWith(prefix)) {
      s = s.slice(prefix.length);
      low = s.toLowerCase();
    }
  }
  if (NATIONALITY_FIX[low]) return NATIONALITY_FIX[low];
  return isUpper(s) ? s.replace(/\p{L}+/gu, (w) => capitalize(w)) : s;
}
const KNOWN_NATIONALITIES = new Set([...NATIONALITIES.map((n) => n.toLowerCase()), ...Object.keys(NATIONALITY_FIX), ...Object.values(NATIONALITY_FIX).map((n) => n.toLowerCase())]);
const isKnownNationality = (v: string) => KNOWN_NATIONALITIES.has(v.replace(/\s+/g, " ").trim().toLowerCase());
function normCity(v: string | undefined): string {
  return CITY_OK[(v ?? "").trim().toLowerCase()] ?? "";
}
function genderOf(v: string): string {
  const l = v.toLowerCase();
  return l.startsWith("m") ? "male" : l.startsWith("f") ? "female" : "";
}
const isCnMobile = (d: string) => /^1[3-9]\d{9}$/.test(d);

// The most frequent value; ties go to the one seen first.
function best(vals: (string | undefined)[]): string {
  const list = vals.filter((v): v is string => !!v);
  if (!list.length) return "";
  const counts = new Map<string, number>();
  for (const v of list) counts.set(v, (counts.get(v) ?? 0) + 1);
  const top = Math.max(...counts.values());
  return list.find((v) => counts.get(v) === top)!;
}
function countsDescending(vals: string[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]); // stable: ties keep first-seen order
}

export async function parseBuyerWorkbooks(files: { name: string; data: Buffer }[]): Promise<ParseResult> {
  const allSheets: RawSheet[] = [];
  for (const file of files) allSheets.push(...(await readXlsxRaw(file.data)));

  const collector = new Collector();
  const summaries: SheetSummary[] = [];
  const passportNameSheets = new Set(PASSPORT_NAME_SHEETS);
  const byName = new Map<string, RawSheet>();
  for (const s of allSheets) if (!byName.has(s.name)) byName.set(s.name, s);

  const handled = new Set<RawSheet>();
  for (const label of KNOWN_ORDER) {
    const sheet = byName.get(label);
    if (!sheet) continue;
    handled.add(sheet);
    const start = collector.recs.length;
    const rows = extractKnown(sheet, collector);
    summaries.push({ sheet: label, expo: collector.recs[start]?.expo ?? "", hidden: sheet.hidden, rows, layout: "known layout" });
  }
  for (const sheet of allSheets) {
    if (handled.has(sheet) || IGNORED_SHEETS.has(sheet.name)) continue;
    const result = extractGeneric(sheet, collector);
    if (result.passportName) passportNameSheets.add(sheet.name);
    summaries.push({ sheet: sheet.name, expo: prettyExpoName(sheet.name), hidden: sheet.hidden, rows: result.count, layout: result.layout });
  }

  const recs = collector.recs;
  const n = recs.length;

  // ----- union-find over rows
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b);
  };
  let members = new Map<number, number[]>();
  const rebuild = () => {
    members = new Map();
    for (let i = 0; i < n; i++) {
      const r = find(i);
      const list = members.get(r);
      if (list) list.push(i);
      else members.set(r, [i]);
    }
  };

  const byPass = new Map<string, number[]>();
  recs.forEach((r, i) => {
    if (!r.p) return;
    const key = /^\d+$/.test(r.p) ? r.p.replace(/^0+/, "") : r.p;
    const list = byPass.get(key);
    if (list) list.push(i);
    else byPass.set(key, [i]);
  });
  for (const list of byPass.values()) for (const j of list.slice(1)) union(list[0], j);
  rebuild();

  const weak: [number, number, string][] = [];
  const passportsOf = (root: number) => new Set((members.get(root) ?? []).map((k) => recs[k].p).filter(Boolean));
  const tryLink = (i: number, j: number, why: string) => {
    const ri = find(i);
    const rj = find(j);
    if (ri === rj) return;
    const pi = passportsOf(ri);
    const pj = passportsOf(rj);
    if (pi.size && pj.size && ![...pi].some((a) => [...pj].some((b) => passEq(a, b)))) {
      weak.push([i, j, why]);
      return;
    }
    union(i, j);
    rebuild();
  };

  const byEmail = new Map<string, number[]>();
  recs.forEach((r, i) => {
    if (!r.e) return;
    const list = byEmail.get(r.e);
    if (list) list.push(i);
    else byEmail.set(r.e, [i]);
  });
  for (const list of byEmail.values()) for (const j of list.slice(1)) tryLink(list[0], j, "same email");

  const byPhone = new Map<string, number[]>();
  recs.forEach((r, i) => {
    for (const ph of new Set([r.ph, r.wcph])) {
      if (!ph) continue;
      const list = byPhone.get(ph);
      if (list) list.push(i);
      else byPhone.set(ph, [i]);
    }
  });
  for (const list of byPhone.values()) {
    for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) if (similarity(nameKey(recs[list[a]].name), nameKey(recs[list[b]].name)) >= 0.8) tryLink(list[a], list[b], "same phone + similar name");
  }

  // ----- rows with only a name: attach to the one person with exactly that name
  const hasKey = (r: Rec) => !!(r.p || r.e || r.ph || r.wcph);
  rebuild();
  const nameClusters = new Map<string, Set<number>>();
  recs.forEach((r, i) => {
    if (!hasKey(r)) return;
    const key = nameKey(r.name);
    const set = nameClusters.get(key);
    if (set) set.add(find(i));
    else nameClusters.set(key, new Set([find(i)]));
  });
  const nameOnlyAttached: number[] = [];
  recs.forEach((r, i) => {
    if (hasKey(r)) return;
    const set = nameClusters.get(nameKey(r.name));
    if (set && set.size === 1) {
      union(i, [...set][0]);
      nameOnlyAttached.push(i);
    }
  });
  rebuild();

  // ----- people whose details conflict are held back
  const weakParent = new Map<number, number>();
  const wf = (x: number): number => {
    if (!weakParent.has(x)) weakParent.set(x, x);
    while (weakParent.get(x) !== x) {
      weakParent.set(x, weakParent.get(weakParent.get(x)!)!);
      x = weakParent.get(x)!;
    }
    return x;
  };
  for (const [i, j] of weak) weakParent.set(wf(find(i)), wf(find(j)));
  const hold = new Set<number>();
  const groupOfRoot = new Map<number, number>();
  const groupIds = new Map<number, number>();
  for (const [i, j] of weak) {
    for (const r of [find(i), find(j)]) {
      hold.add(r);
      const comp = wf(r);
      if (!groupIds.has(comp)) groupIds.set(comp, groupIds.size + 1);
      groupOfRoot.set(r, groupIds.get(comp)!);
    }
  }

  // ----- who owns each phone number (a number shared by two people is kept by the one with more rows)
  const clusters = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    const list = clusters.get(r);
    if (list) list.push(i);
    else clusters.set(r, [i]);
  }
  const phoneCount = new Map<string, Map<number, number>>();
  for (const [root, ids] of clusters) {
    for (const i of ids) {
      for (const ph of new Set([recs[i].ph, recs[i].wcph])) {
        if (!ph) continue;
        let m = phoneCount.get(ph);
        if (!m) phoneCount.set(ph, (m = new Map()));
        m.set(root, (m.get(root) ?? 0) + 1);
      }
    }
  }
  const phoneOwner = new Map<string, number>();
  for (const [ph, m] of phoneCount) {
    const top = [...m.entries()].sort((a, b) => b[1] - a[1]);
    if (top.length === 1 || top[0][1] > top[1][1]) phoneOwner.set(ph, top[0][0]);
  }

  // ----- build the people
  const buyers: ImportBuyer[] = [];
  const held: HeldRow[] = [];
  const skipped: SkippedPerson[] = [];
  const heldRoots = new Set<number>();
  for (const [root, ids] of clusters) {
    const rs = ids.map((i) => recs[i]);
    const namesPp = rs.filter((r) => passportNameSheets.has(r.sheet) && r.name).map((r) => r.name);
    const longest = rs.map((r) => r.name).reduce((a, b) => (b.length > a.length ? b : a));
    const nm = titleName(best(namesPp) || longest);
    const passport = countsDescending(rs.map((r) => r.p).filter(Boolean))[0]?.[0] ?? "";
    const email = best(rs.map((r) => r.e));
    const phones = [...rs.map((r) => r.ph).filter(Boolean), ...rs.map((r) => r.wcph).filter(Boolean)].filter((ph) => phoneOwner.get(ph) === root);
    const ranked = countsDescending(phones);
    const cn = ranked.filter(([p]) => isCnMobile(p)).map(([p]) => p);
    const phone = cn[0] ?? ranked[0]?.[0] ?? "";
    const wechat = best(rs.map((r) => (r.f.wechat ?? "").trim()));
    const expos = [...new Set(rs.map((r) => r.expo).filter(Boolean))].sort();

    if (hold.has(root)) {
      heldRoots.add(root);
      for (const r of rs)
        held.push({ group: groupOfRoot.get(root) ?? 0, person: nm, sheet: r.sheet, expo: r.expo, name: r.name, passport: r.f.passport ?? "", email: r.f.email ?? "", phone: r.f.phone || r.f.wechat || "", company: r.f.company ?? "" });
      continue;
    }

    const visa = best(rs.map((r) => r.f.visa));
    const birth = rs.map((r) => parseBirth(r.f.birth ?? "")).find((b) => b !== null) ?? null;
    const buyer: ImportBuyer = {
      name: nm,
      email,
      phone,
      wechatId: wechat,
      passportNumber: passport,
      passportName: namesPp.length ? nm : "",
      password: phone || (wechat && wechat.length >= 6 ? wechat : "") || passport || "",
      nationality: nationality(best(rs.map((r) => r.f.nationality)) || best(rs.map((r) => r.f.country))),
      gender: genderOf(best(rs.map((r) => r.f.gender))),
      companyName: best(rs.map((r) => r.f.company)),
      jobTitle: best(rs.map((r) => r.f.job)),
      departureCity: best(rs.filter((r) => r.f.city).map((r) => normCity(CITY_FIX[r.f.city!] ?? r.f.city)).filter(Boolean)),
      companyField: best(rs.map((r) => r.f.field)),
      overseasCompanyAddress: best(rs.map((r) => r.f.address)),
      attendanceDay: best(rs.map((r) => r.f.attendday)),
      meetingOrVisiting: best(rs.map((r) => r.f.meeting)).toLowerCase(),
      visaType: VISA_FIX[visa] ?? visa,
      purchaseIntention: [...new Set(rs.map((r) => r.f.products).filter((x): x is string => !!x))].join("; ").slice(0, 1000),
      buyerNumber: best(rs.map((r) => (r.f.buyerno ?? "").toUpperCase())),
      dateOfBirth: birth?.iso ?? "",
      dateOfBirthApproximate: birth?.approximate ? "yes" : "",
      expos,
    };
    buyer.country = buyer.nationality;

    if (!(email || phone || passport) || !buyer.password) {
      skipped.push({
        name: nm,
        expos,
        sheets: [...new Set(rs.map((r) => r.sheet))].sort(),
        passport,
        email,
        phone,
        why: "No email, phone or passport number to sign in with",
      });
      continue;
    }
    // Leave empty values out of the file.
    const compact = Object.fromEntries(Object.entries(buyer).filter(([k, v]) => k === "expos" || (typeof v === "string" ? v !== "" : v !== undefined))) as unknown as ImportBuyer;
    buyers.push(compact);
  }

  buyers.sort((a, b) => {
    const x = a.name.toLowerCase();
    const y = b.name.toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  });

  const nameOnlyMatches: NameOnlyMatch[] = nameOnlyAttached.map((i) => {
    const m = clusters.get(find(i)) ?? [];
    const other = m.find((j) => !nameOnlyAttached.includes(j));
    return {
      name: recs[i].name,
      sheet: recs[i].sheet,
      expo: recs[i].expo,
      matchedPerson: other !== undefined ? recs[other].name : "",
      passport: m.map((j) => recs[j].p).find(Boolean) ?? "",
    };
  });

  return {
    buyers,
    held,
    heldPeople: heldRoots.size,
    skipped,
    nameOnlyMatches,
    sheets: summaries,
    totalRows: n,
    repaired: collector.repaired,
    loginBy: {
      email: buyers.filter((b) => b.email).length,
      phone: buyers.filter((b) => !b.email && b.phone).length,
      passport: buyers.filter((b) => !b.email && !b.phone).length,
    },
  };
}
