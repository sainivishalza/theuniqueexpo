import ExcelJS from "exceljs";
import { ZipFile } from "yazl";
import { DOCUMENT_FIELDS, type BuyerExportProfile, type DocumentField } from "./buyer-profile-repo";

// English-only labels for the exported file itself (not the live admin
// UI, which is already translated via next-intl) -- an Excel/ZIP an admin
// hands off to someone else should read the same regardless of which
// locale the admin currently has the site set to.
export const FIELD_LABELS: Record<string, string> = {
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
};

export const DOC_LABELS: Record<DocumentField, string> = {
  businessLicense: "Business License",
  businessCard: "Business Card",
  passportFront: "Passport Front Page",
  visaPage: "Visa Page",
  cantonFairCard: "Canton Fair Card",
  buyerPhoto: "Buyer Photo",
  invoiceOrderList: "Invoice / Order List",
};

export const EXPORTABLE_FIELD_KEYS = Object.keys(FIELD_LABELS);

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
export async function buildBuyersExcel(rows: BuyerExportProfile[], fieldKeys: string[]): Promise<Buffer> {
  const textKeys = fieldKeys.filter((k) => k in FIELD_LABELS);
  const docKeys = fieldKeys.filter((k): k is DocumentField => (DOCUMENT_FIELDS as readonly string[]).includes(k));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Buyers");
  sheet.columns = [
    ...textKeys.map((k) => ({ header: FIELD_LABELS[k], key: k, width: 24 })),
    ...docKeys.map((k) => ({ header: DOC_LABELS[k], key: k, width: 16 })),
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle" };

  const asRecord = rows as unknown as Record<string, unknown>[];
  rows.forEach((row, rowIndex) => {
    const values: Record<string, string> = {};
    for (const key of textKeys) {
      const value = (asRecord[rowIndex] as Record<string, unknown>)[key];
      values[key] = typeof value === "string" ? value : "";
    }
    const excelRow = sheet.addRow(values);
    if (docKeys.length > 0) excelRow.height = 72;

    docKeys.forEach((docKey, docIndex) => {
      const dataUrl = row.documentData[docKey];
      const colIndex = textKeys.length + docIndex;
      if (!dataUrl) return;
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) return;
      if (!EXCEL_IMAGE_TYPES.has(parsed.extension)) {
        sheet.getRow(excelRow.number).getCell(colIndex + 1).value = "PDF file (see ZIP export)";
        return;
      }
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
export async function buildBuyersDocumentsZip(rows: BuyerExportProfile[]): Promise<Buffer> {
  const zipfile = new ZipFile();
  const usedNames = new Map<string, number>();

  for (const row of rows) {
    let folderName = sanitizeFolderName(row.passportName || row.name || `buyer-${row.userId}`);
    const count = usedNames.get(folderName) ?? 0;
    usedNames.set(folderName, count + 1);
    if (count > 0) folderName = `${folderName} (${count + 1})`;

    for (const field of DOCUMENT_FIELDS) {
      const dataUrl = row.documentData[field];
      if (!dataUrl) continue;
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) continue;
      zipfile.addBuffer(parsed.buffer, `${folderName}/${DOC_LABELS[field]}.${parsed.extension}`);
    }
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    zipfile.outputStream.on("data", (chunk) => chunks.push(chunk));
    zipfile.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
    zipfile.outputStream.on("error", reject);
    zipfile.end();
  });
}
