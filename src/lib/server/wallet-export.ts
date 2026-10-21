import ExcelJS from "exceljs";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { formatBuyerNumber } from "@/lib/buyer-number";

// Excel files for the money side of the rewards wallet. English-only headings, like the
// buyer exports: a file handed to an accountant reads the same whatever language the admin uses.

const WITHDRAWAL_STATUSES = ["pending", "paid", "rejected", "cancelled"];
const METHOD_LABELS: Record<string, string> = { alipay: "Alipay", wechat: "WeChat", bank: "China bank" };
const TYPE_LABELS: Record<string, string> = {
  attendance: "Attendance points",
  expense: "Expense claim",
  topup: "Top-up",
  transfer_in: "Transfer received",
  transfer_out: "Transfer sent",
  withdrawal_hold: "Withdrawal (points held)",
  withdrawal_refund: "Withdrawal refund",
  purchase: "Package purchase",
  purchase_refund: "Purchase refund",
  adjustment: "Manual adjustment",
};

export const MAX_WITHDRAWAL_ROWS = 2000;
export const MAX_MOVEMENT_ROWS = 50_000;

function when(value: unknown): string {
  return value ? String(value).slice(0, 19) : "";
}

function toBuffer(written: unknown): Buffer {
  return Buffer.from(written as Uint8Array);
}

function parseQr(dataUrl: string | null): { buffer: Buffer; extension: "png" | "jpeg" | "gif" } | null {
  const match = dataUrl ? /^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/.exec(dataUrl) : null;
  if (!match) return null;
  return { buffer: Buffer.from(match[2], "base64"), extension: match[1] === "jpg" ? "jpeg" : (match[1] as "png" | "jpeg" | "gif") };
}

// The withdrawal requests of one status (or all), laid out for paying them by hand:
// who, how much (1 point = 1 RMB), where to send it, and the receiving QR code in the sheet.
export async function buildWithdrawalsExcel(status: string): Promise<Buffer> {
  const where = WITHDRAWAL_STATUSES.includes(status) ? "WHERE w.status = ?" : "";
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT w.id, w.points, w.method, w.qr_image, w.account_name, w.bank_name, w.bank_branch, w.bank_account, w.note, w.status,
            w.payout_reference, w.admin_note, w.created_at, w.processed_at, u.name, u.email, u.buyer_no
     FROM wallet_withdrawals w JOIN users u ON u.id = w.user_id
     ${where} ORDER BY w.id ASC LIMIT ?`,
    [...(where ? [status] : []), MAX_WITHDRAWAL_ROWS]
  );
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Withdrawals");
  sheet.columns = [
    { header: "Request No.", key: "id", width: 12 },
    { header: "Requested (UTC)", key: "created", width: 20 },
    { header: "Buyer Registration No.", key: "buyerNo", width: 22 },
    { header: "Name", key: "name", width: 26 },
    { header: "Account Email", key: "email", width: 30 },
    { header: "Amount (RMB)", key: "points", width: 14 },
    { header: "Pay by", key: "method", width: 14 },
    { header: "Name on account", key: "accountName", width: 26 },
    { header: "Bank", key: "bankName", width: 24 },
    { header: "Bank branch", key: "bankBranch", width: 26 },
    { header: "Bank account no.", key: "bankAccount", width: 26 },
    { header: "Receiving QR code", key: "qr", width: 18 },
    { header: "Buyer's note", key: "note", width: 30 },
    { header: "Status", key: "status", width: 12 },
    { header: "Payout reference", key: "payoutReference", width: 22 },
    { header: "Admin note", key: "adminNote", width: 30 },
    { header: "Handled (UTC)", key: "processed", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };
  const qrColumn = sheet.columns.findIndex((c) => c.key === "qr");
  rows.forEach((r) => {
    const row = sheet.addRow({
      id: Number(r.id),
      created: when(r.created_at),
      buyerNo: formatBuyerNumber(r.buyer_no),
      name: r.name,
      email: r.email,
      points: Number(r.points),
      method: METHOD_LABELS[r.method as string] ?? r.method,
      accountName: r.account_name,
      bankName: r.bank_name,
      bankBranch: r.bank_branch,
      // Text, so a long account number is not turned into 1.2E+15.
      bankAccount: r.bank_account ? String(r.bank_account) : "",
      qr: "",
      note: r.note,
      status: r.status,
      payoutReference: r.payout_reference,
      adminNote: r.admin_note,
      processed: when(r.processed_at),
    });
    row.getCell("bankAccount").numFmt = "@";
    const qr = parseQr(r.qr_image as string | null);
    if (qr) {
      row.height = 72;
      const imageId = workbook.addImage({ buffer: qr.buffer, extension: qr.extension } as unknown as ExcelJS.Image);
      sheet.addImage(imageId, { tl: { col: qrColumn, row: row.number - 1 }, ext: { width: 90, height: 90 }, editAs: "oneCell" });
    }
  });
  return toBuffer(await workbook.xlsx.writeBuffer());
}

// Every movement of points in a date range (UTC days, both ends included), oldest first,
// one row per ledger entry -- what an accountant needs to check the books.
export async function buildMovementsExcel(from: string | null, to: string | null): Promise<{ buffer: Buffer; truncated: boolean }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (from) {
    conditions.push("t.created_at >= ?");
    params.push(from);
  }
  if (to) {
    conditions.push("t.created_at < DATE_ADD(?, INTERVAL 1 DAY)");
    params.push(to);
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.id, t.created_at, t.amount, t.balance_after, t.type, t.note, u.name, u.email, u.buyer_no,
            c.name AS c_name, c.buyer_no AS c_no, a.name AS admin_name
     FROM wallet_transactions t JOIN users u ON u.id = t.user_id
          LEFT JOIN users c ON c.id = t.counterparty_user_id LEFT JOIN users a ON a.id = t.created_by
     ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""} ORDER BY t.id ASC LIMIT ?`,
    [...params, MAX_MOVEMENT_ROWS + 1]
  );
  const truncated = rows.length > MAX_MOVEMENT_ROWS;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Point movements");
  sheet.columns = [
    { header: "Entry No.", key: "id", width: 12 },
    { header: "Date (UTC)", key: "date", width: 20 },
    { header: "Buyer Registration No.", key: "buyerNo", width: 22 },
    { header: "Name", key: "name", width: 26 },
    { header: "Account Email", key: "email", width: 30 },
    { header: "Type", key: "type", width: 26 },
    { header: "Points (+ added / − taken)", key: "amount", width: 24 },
    { header: "Balance after", key: "balanceAfter", width: 16 },
    { header: "Note", key: "note", width: 40 },
    { header: "Other buyer", key: "counterparty", width: 28 },
    { header: "Done by admin", key: "by", width: 22 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  rows.slice(0, MAX_MOVEMENT_ROWS).forEach((r) => {
    sheet.addRow({
      id: Number(r.id),
      date: when(r.created_at),
      buyerNo: formatBuyerNumber(r.buyer_no),
      name: r.name,
      email: r.email,
      type: TYPE_LABELS[r.type as string] ?? r.type,
      amount: Number(r.amount),
      balanceAfter: Number(r.balance_after),
      note: r.note,
      counterparty: r.c_name ? `${r.c_name} ${formatBuyerNumber(r.c_no)}`.trim() : "",
      by: r.admin_name ?? "",
    });
  });
  return { buffer: toBuffer(await workbook.xlsx.writeBuffer()), truncated };
}
