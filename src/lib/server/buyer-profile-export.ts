import ExcelJS from "exceljs";
import { ZipFile } from "yazl";
import { TEXT_COLUMN_ORDER } from "../buyer-profile-columns";
import type { FormItem } from "../buyer-form";
import type { BuyerExportProfile, DocumentField } from "./buyer-profile-repo";
import { SITE_URL } from "../seo";

// English-only labels for the exported file itself (not the live admin
// UI, which is already translated via next-intl) -- an Excel/ZIP an admin
// hands off to someone else should read the same regardless of which
// locale the admin currently has the site set to.
export const FIELD_LABELS: Record<string, string> = {
  buyerNumber: "Buyer Registration No.",
  name: "Name",
  email: "Account Email",
  companyName: "Company Name",
  nationality: "Nationality",
  passportNumber: "Passport Number",
  annualTurnover: "Annual Turnover",
  contactPerson: "Contact Person",
  purchaseIntention: "Purchase Intention",
  otherPurchaseIntention: "Other Purchase Intention",
  registrationCode: "Registration Code",
  sourceExhibitions: "Source Exhibition(s)",
  dateOfBirth: "Date of Birth",
  visaType: "Visa Type",
  visaExpireDate: "Visa Expiry Date",
  passportExpireDate: "Passport Expiry Date",
  departureCity: "Departure City",
  attendanceDay: "Attendance Day",
  meetingOrVisiting: "Meeting or Visiting",
  passportName: "Passport Name",
  gender: "Gender",
  wechatId: "WeChat ID",
  overseasCompanyAddress: "Overseas Company Address",
  companyField: "Company Field",
  jobTitle: "Job Title",
  contactEmail: "Contact Email",
  phoneNumber: "Phone Number",
  rewardPoints: "Reward Points",
};

// The built-in names, kept as a reference; the exports use the names in Admin -> Buyer form settings.
export const DOC_LABELS: Record<DocumentField, string> = {
  businessLicense: "Business License",
  businessCard: "Business Card",
  passportFront: "Passport Front Page",
  visaPage: "Visa Page",
  cantonFairCard: "Canton Fair Card",
  buyerPhoto: "Buyer Photo",
  invoiceOrderList: "Invoice / Order List",
  latestEntryStamp: "Latest Entry Stamp Photo",
};

export const EXPORTABLE_FIELD_KEYS = Object.keys(FIELD_LABELS);

// A document name as a file name: a "/" would create a nested folder, and some characters are not allowed in file names.
function fileSafe(name: string): string {
  return name.replace(/\s*\/\s*/g, " - ").replace(/[\\:*?"<>|]/g, "_").trim() || "Document";
}

function sanitizeFolderName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "_").trim();
  return cleaned || "Unknown";
}

interface ParsedDataUrl {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

function parseDataUrl(dataUrl: string): ParsedDataUrl | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const [, contentType, base64] = match;
  const extension = contentType === "application/pdf" ? "pdf" : contentType.split("/")[1]?.replace("jpg", "jpeg") || "bin";
  return { buffer: Buffer.from(base64, "base64"), contentType, extension };
}

const EXCEL_IMAGE_TYPES = new Set(["jpeg", "png", "gif"]);

// Builds one worksheet: a header row of translated column labels, one row
// per buyer, and (for any ticked document field) the actual photo
// embedded in its cell rather than just a filename or a checkmark -- a
// PDF document can't be embedded as an image, so it's left as a text note
// in that cell instead.
//
// The photo is a drawing laid over the cell, which Excel and WPS on a computer show but
// most phone viewers do not (they draw only the cells). So every document cell also holds a
// link, in its lower part below the photo, that opens the picture in the browser: the same
// sheet then works on a phone, where the admin is signed in.
export async function buildBuyersExcel(rows: BuyerExportProfile[], fieldKeys: string[], items: FormItem[], siteUrl = SITE_URL): Promise<Buffer> {
  // Number, name and account email first, then the same order as the table on screen -- whatever
  // order the browser sent the fields in.
  const LEAD = ["buyerNumber", "name", "email"];
  const rank = (k: string) => {
    const lead = LEAD.indexOf(k);
    if (lead >= 0) return lead;
    const i = (TEXT_COLUMN_ORDER as readonly string[]).indexOf(k);
    return LEAD.length + (i >= 0 ? i : TEXT_COLUMN_ORDER.length);
  };
  const textKeys = fieldKeys.filter((k) => k in FIELD_LABELS).sort((a, b) => rank(a) - rank(b));
  // Extra information fields an admin added come after the built-in ones, then the documents; both
  // follow the order set in Buyer form settings, whatever order they were ticked in.
  const customFields = items.filter((i) => i.kind === "field" && i.active && fieldKeys.includes(i.key));
  const docItems = items.filter((i) => i.kind === "document" && i.active && fieldKeys.includes(i.key));
  const docKeys = docItems.map((i) => i.key);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Buyers");
  sheet.columns = [
    ...textKeys.map((k) => ({ header: FIELD_LABELS[k], key: k, width: 24 })),
    ...customFields.map((f) => ({ header: f.labels.en, key: f.key, width: 24 })),
    ...docItems.map((d) => ({ header: d.labels.en, key: d.key, width: 16 })),
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle" };

  const asRecord = rows as unknown as Record<string, unknown>[];
  rows.forEach((row, rowIndex) => {
    const values: Record<string, string | number> = {};
    for (const key of textKeys) {
      const value = (asRecord[rowIndex] as Record<string, unknown>)[key];
      // Points stay a real number in the sheet, so they can be added up or sorted.
      values[key] = typeof value === "string" || typeof value === "number" ? value : "";
    }
    for (const field of customFields) values[field.key] = row.custom[field.key] ?? "";
    const excelRow = sheet.addRow(values);
    // Room for the 90 px photo and, under it, the line with the link.
    if (docKeys.length > 0) excelRow.height = 90;

    docKeys.forEach((docKey, docIndex) => {
      const dataUrl = row.documentData[docKey];
      const colIndex = textKeys.length + customFields.length + docIndex;
      if (!dataUrl) return;
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) return;
      const cell = sheet.getRow(excelRow.number).getCell(colIndex + 1);
      const link = `${siteUrl}/api/admin/buyer-profiles/${row.userId}/documents/${encodeURIComponent(docKey)}`;
      cell.font = { color: { argb: "FF1D4ED8" }, underline: true, size: 10 };
      cell.alignment = { vertical: "bottom", horizontal: "left" };
      if (!EXCEL_IMAGE_TYPES.has(parsed.extension)) {
        cell.value = { text: "Open PDF file", hyperlink: link };
        cell.alignment = { vertical: "middle", horizontal: "left" };
        return;
      }
      cell.value = { text: "Open picture", hyperlink: link };
      // exceljs's bundled Buffer type doesn't structurally match the
      // Node Buffer generic this project's @types/node produces --
      // functionally identical at runtime, just a type-declaration
      // mismatch between the two packages.
      const imageId = workbook.addImage({ buffer: parsed.buffer, extension: parsed.extension as "jpeg" | "png" | "gif" } as unknown as ExcelJS.Image);
      sheet.addImage(imageId, {
        tl: { col: colIndex, row: excelRow.number - 1 },
        ext: { width: 90, height: 90 },
        editAs: "oneCell",
      });
    });
  });

  const written = await workbook.xlsx.writeBuffer();
  return Buffer.from(written as unknown as Uint8Array);
}

// One folder per buyer (named after their passport name, falling back to
// their account name or user ID, with " (2)" etc. appended for a
// collision) containing only that buyer's own uploaded documents -- no
// empty folders or placeholder files for a document they never uploaded.
export async function buildBuyersDocumentsZip(rows: BuyerExportProfile[], items: FormItem[]): Promise<Buffer> {
  const docItems = items.filter((i) => i.kind === "document" && i.active);
  const zipfile = new ZipFile();
  const usedNames = new Map<string, number>();

  for (const row of rows) {
    // "TUE0012 - Name": the folder starts with the buyer's registration number, so a
    // folder can always be matched back to the buyer, and sorts in number order.
    let folderName = sanitizeFolderName(`${row.buyerNumber ? `${row.buyerNumber} - ` : ""}${row.passportName || row.name || `buyer-${row.userId}`}`);
    const count = usedNames.get(folderName) ?? 0;
    usedNames.set(folderName, count + 1);
    if (count > 0) folderName = `${folderName} (${count + 1})`;

    docItems.forEach((item, index) => {
      const dataUrl = row.documentData[item.key];
      if (!dataUrl) return;
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) return;
      // Numbered so a folder window (which sorts A-Z) shows them in the order set in Buyer form settings.
      const fileLabel = fileSafe(item.labels.en);
      zipfile.addBuffer(parsed.buffer, `${folderName}/${index + 1} - ${fileLabel}.${parsed.extension}`);
    });
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    zipfile.outputStream.on("data", (chunk) => chunks.push(chunk));
    zipfile.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
    zipfile.outputStream.on("error", reject);
    zipfile.end();
  });
}
