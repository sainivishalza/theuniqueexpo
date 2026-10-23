import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { getBuyerNumber } from "@/lib/server/buyer-numbers";
import { ticketCode } from "@/lib/server/ticket-code";

// The two documents a buyer can print once registered: the visa invitation letter and the e-ticket / badge. Both are
// drawn here as PDFs, in English (the language visa offices and venue staff read). The built-in PDF fonts only hold
// Latin letters, so anything else (a company name in Chinese, say) is left out rather than printed as boxes.

const SITE = "https://theuniqueexpo.com";
const CONTACT = "info@theuniqueexpo.com";
const GREEN = rgb(0.027, 0.357, 0.31);
const INK = rgb(0.1, 0.12, 0.12);
const GREY = rgb(0.4, 0.43, 0.43);

/** Letters a built-in PDF font can print: plain ASCII, with accents folded away. */
export function latinSafe(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface DocumentSubject {
  registrationId: number;
  status: string;
  userId: number;
  name: string;
  passportName: string;
  passportNumber: string;
  nationality: string;
  dateOfBirth: string;
  jobTitle: string;
  company: string;
  country: string;
  buyerNumber: string;
  expoTitle: string;
  expoStart: string;
  expoEnd: string;
  venue: string;
  city: string;
}

export async function loadDocumentSubject(registrationId: number): Promise<DocumentSubject | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT r.id, r.status, r.user_id, u.name, e.title, e.start_date, e.end_date, e.venue, e.city,
            p.passport_name, p.passport_number, p.nationality, p.date_of_birth, p.job_title, p.company_name, p.contact_person
     FROM expo_registrations r
     JOIN users u ON u.id = r.user_id
     JOIN exhibitions e ON e.id = r.exhibition_id
     LEFT JOIN buyer_profiles p ON p.user_id = r.user_id
     WHERE r.id = ? LIMIT 1`,
    [registrationId]
  );
  const r = rows[0];
  if (!r) return null;
  const day = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "").slice(0, 10));
  return {
    registrationId: Number(r.id),
    status: String(r.status),
    userId: Number(r.user_id),
    name: String(r.name ?? ""),
    passportName: String(r.passport_name ?? ""),
    passportNumber: String(r.passport_number ?? ""),
    nationality: String(r.nationality ?? ""),
    dateOfBirth: String(r.date_of_birth ?? ""),
    jobTitle: String(r.job_title ?? ""),
    company: String(r.company_name ?? ""),
    country: String(r.nationality ?? ""),
    buyerNumber: await getBuyerNumber(Number(r.user_id)),
    expoTitle: String(r.title ?? ""),
    expoStart: day(r.start_date),
    expoEnd: day(r.end_date),
    venue: String(r.venue ?? ""),
    city: String(r.city ?? ""),
  };
}

const LONG = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const NO_YEAR = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
function longDate(day: string): string {
  const d = new Date(`${day.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? "" : LONG.format(d);
}
export function dateRange(start: string, end: string): string {
  if (!end || end === start) return longDate(start);
  const a = new Date(`${start}T00:00:00Z`);
  const b = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return longDate(start);
  if (a.getUTCFullYear() === b.getUTCFullYear()) return `${NO_YEAR.format(a)} - ${longDate(end)}`;
  return `${longDate(start)} - ${longDate(end)}`;
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const attempt = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(attempt, size) <= maxWidth || !line) line = attempt;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function paragraph(page: PDFPage, text: string, font: PDFFont, size: number, x: number, y: number, maxWidth: number, lineHeight: number, color = INK): number {
  for (const line of wrap(text, font, size, maxWidth)) {
    page.drawText(line, { x, y, size, font, color });
    y -= lineHeight;
  }
  return y;
}

/** Can this person be written into the letter? The passport name and number are what a visa office checks. */
export function invitationMissing(s: DocumentSubject): string[] {
  const missing: string[] = [];
  if (!latinSafe(s.passportName)) missing.push("passportName");
  if (!latinSafe(s.passportNumber)) missing.push("passportNumber");
  return missing;
}

export function invitationReference(registrationId: number): string {
  return `UE-INV-${String(registrationId).padStart(6, "0")}`;
}

export async function buildInvitationLetter(s: DocumentSubject, now = new Date()): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invitation letter ${invitationReference(s.registrationId)}`);
  pdf.setAuthor("The Unique Expo");
  const page = pdf.addPage([595.28, 841.89]); // A4
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const left = 64;
  const width = 595.28 - left * 2;

  page.drawRectangle({ x: 0, y: 841.89 - 12, width: 595.28, height: 12, color: GREEN });
  page.drawText("THE UNIQUE EXPO", { x: left, y: 770, size: 20, font: bold, color: GREEN });
  page.drawText(`${SITE.replace("https://", "")}  |  ${CONTACT}`, { x: left, y: 752, size: 9, font: regular, color: GREY });

  page.drawText("INVITATION LETTER", { x: left, y: 700, size: 16, font: bold, color: INK });
  page.drawText(`Ref: ${invitationReference(s.registrationId)}`, { x: left, y: 678, size: 10, font: regular, color: INK });
  page.drawText(`Date: ${longDate(now.toISOString().slice(0, 10))}`, { x: left, y: 663, size: 10, font: regular, color: INK });

  let y = 630;
  y = paragraph(page, "To whom it may concern,", regular, 11, left, y, width, 16);
  y -= 8;
  const venue = [latinSafe(s.venue), latinSafe(s.city)].filter(Boolean).join(", ");
  y = paragraph(
    page,
    `On behalf of The Unique Expo, we are pleased to invite the person named below to attend ${latinSafe(s.expoTitle)}, which takes place from ${dateRange(s.expoStart, s.expoEnd)}${venue ? ` at ${venue}` : ""}, China.`,
    regular, 11, left, y, width, 16
  );
  y -= 14;

  const rows: [string, string][] = [
    ["Name (as in passport)", latinSafe(s.passportName)],
    ["Passport number", latinSafe(s.passportNumber)],
    ["Nationality", latinSafe(s.nationality)],
    ["Date of birth", /^\d{4}-\d{2}-\d{2}/.test(s.dateOfBirth) ? longDate(s.dateOfBirth) : latinSafe(s.dateOfBirth)],
    ["Position", latinSafe(s.jobTitle)],
    ["Company", latinSafe(s.company)],
    ["Registration number", latinSafe(s.buyerNumber)],
  ].filter((r): r is [string, string] => !!r[1]);
  for (const [label, value] of rows) {
    page.drawText(label, { x: left, y, size: 10, font: regular, color: GREY });
    page.drawText(value, { x: left + 150, y, size: 11, font: bold, color: INK });
    page.drawLine({ start: { x: left, y: y - 6 }, end: { x: left + width, y: y - 6 }, thickness: 0.4, color: rgb(0.85, 0.87, 0.87) });
    y -= 24;
  }
  y -= 8;
  y = paragraph(page, "The purpose of the visit is business: to meet exhibitors, to source products and to take part in the exhibition. The visitor covers their own travel and accommodation costs.", regular, 11, left, y, width, 16);
  y -= 8;
  y = paragraph(page, `We kindly ask the relevant authorities to grant the visitor the visa needed for this visit. If you need any further information, please contact us at ${CONTACT}.`, regular, 11, left, y, width, 16);
  y -= 24;
  page.drawText("Sincerely,", { x: left, y, size: 11, font: regular, color: INK });
  page.drawText("The Unique Expo", { x: left, y: y - 18, size: 12, font: bold, color: INK });
  page.drawText("Buyer registration team", { x: left, y: y - 33, size: 10, font: regular, color: GREY });

  paragraph(
    page,
    `This letter was produced from the visitor's registration on ${SITE.replace("https://", "")}. It is not a visa and does not guarantee that a visa will be granted.`,
    regular, 8, left, 60, width, 11, GREY
  );
  return pdf.save();
}

export function ticketUrl(registrationId: number): string {
  return `${SITE}/en/admin/ticket-check?code=${encodeURIComponent(ticketCode(registrationId))}`;
}

export async function buildTicket(s: DocumentSubject): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`E-ticket ${latinSafe(s.expoTitle)}`);
  pdf.setAuthor("The Unique Expo");
  const W = 297.64; // A6 portrait: a badge
  const H = 419.53;
  const page = pdf.addPage([W, H]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: H - 92, width: W, height: 92, color: GREEN });
  const titleLines = wrap(latinSafe(s.expoTitle) || "Exhibition", bold, 14, W - 40).slice(0, 3);
  let y = H - 34;
  for (const line of titleLines) {
    page.drawText(line, { x: 20, y, size: 14, font: bold, color: rgb(1, 1, 1) });
    y -= 17;
  }
  page.drawText(dateRange(s.expoStart, s.expoEnd), { x: 20, y: H - 84, size: 9, font: regular, color: rgb(0.85, 0.95, 0.92) });

  const venue = [latinSafe(s.venue), latinSafe(s.city)].filter(Boolean).join(", ");
  if (venue) paragraph(page, venue, regular, 9, 20, H - 112, W - 40, 12, GREY);

  const name = latinSafe(s.passportName) || latinSafe(s.name) || "Visitor";
  const nameSize = name.length > 22 ? 16 : 20;
  let ny = H - 150;
  for (const line of wrap(name, bold, nameSize, W - 40).slice(0, 2)) {
    page.drawText(line, { x: 20, y: ny, size: nameSize, font: bold, color: INK });
    ny -= nameSize + 4;
  }
  const company = latinSafe(s.company);
  if (company) ny = paragraph(page, company, regular, 11, 20, ny - 2, W - 40, 14);
  const meta = [latinSafe(s.nationality), latinSafe(s.buyerNumber)].filter(Boolean).join("   |   ");
  if (meta) page.drawText(meta, { x: 20, y: ny - 6, size: 10, font: bold, color: GREEN });

  const qr = await QRCode.toBuffer(ticketUrl(s.registrationId), { margin: 1, width: 360, errorCorrectionLevel: "M" });
  const image = await pdf.embedPng(qr);
  const size = 128;
  page.drawImage(image, { x: (W - size) / 2, y: 52, width: size, height: size });
  const hint = "Show this code at the entrance";
  page.drawText(hint, { x: (W - regular.widthOfTextAtSize(hint, 8)) / 2, y: 36, size: 8, font: regular, color: GREY });
  const foot = `Ticket ${String(s.registrationId).padStart(6, "0")}  |  ${SITE.replace("https://", "")}`;
  page.drawText(foot, { x: (W - regular.widthOfTextAtSize(foot, 7)) / 2, y: 20, size: 7, font: regular, color: GREY });
  return pdf.save();
}
