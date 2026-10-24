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
  referral: "Referral reward",
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

export const MAX_STATEMENT_ROWS = 20_000;

/** "2026-03" -> the first day of that month and of the next, as UTC dates (YYYY-MM-DD); null when it is not a month. */
export function monthBounds(month: string): { start: string; end: string } | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!m) return null;
  const year = Number(m[1]);
  const index = Number(m[2]) - 1;
  if (year < 2000 || year > 2100) return null;
  const day = (d: Date) => d.toISOString().slice(0, 10);
  return { start: day(new Date(Date.UTC(year, index, 1))), end: day(new Date(Date.UTC(year, index + 1, 1))) };
}

// One month of the rewards wallet for the accountant (UTC months; 1 point = 1 RMB): the balance at the start, what was
// added and taken away by kind, the balance at the end, and a check that the buyers' balances agree with the ledger.
// Second sheet: the same per buyer.
export async function buildMonthlyStatementExcel(month: string): Promise<{ buffer: Buffer; truncated: boolean } | null> {
  const bounds = monthBounds(month);
  if (!bounds) return null;
  const { start, end } = bounds;

  const [[open]] = await pool.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount), 0) AS total FROM wallet_transactions WHERE created_at < ?", [start]);
  const [byType] = await pool.query<RowDataPacket[]>(
    `SELECT type, COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS added, COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0) AS taken, COUNT(*) AS entries
     FROM wallet_transactions WHERE created_at >= ? AND created_at < ? GROUP BY type ORDER BY type`,
    [start, end]
  );
  const [[nowRow]] = await pool.query<RowDataPacket[]>("SELECT COALESCE(SUM(balance), 0) AS balances FROM wallets");
  const [[ledgerNow]] = await pool.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount), 0) AS total FROM wallet_transactions");
  const [[paid]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n, COALESCE(SUM(points), 0) AS pts FROM wallet_withdrawals WHERE status = 'paid' AND processed_at >= ? AND processed_at < ?", [start, end]);
  const [[topups]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n, COALESCE(SUM(approved_points), 0) AS pts FROM wallet_topups WHERE status = 'approved' AND reviewed_at >= ? AND reviewed_at < ?", [start, end]);
  const [[pending]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n, COALESCE(SUM(points), 0) AS pts FROM wallet_withdrawals WHERE status = 'pending'");
  const [people] = await pool.query<RowDataPacket[]>(
    `SELECT u.name, u.email, u.buyer_no,
            COALESCE(SUM(CASE WHEN t.created_at < ? THEN t.amount ELSE 0 END), 0) AS opening,
            COALESCE(SUM(CASE WHEN t.created_at >= ? AND t.amount > 0 THEN t.amount ELSE 0 END), 0) AS added,
            COALESCE(SUM(CASE WHEN t.created_at >= ? AND t.amount < 0 THEN -t.amount ELSE 0 END), 0) AS taken
     FROM wallet_transactions t JOIN users u ON u.id = t.user_id
     WHERE t.created_at < ?
     GROUP BY t.user_id, u.name, u.email, u.buyer_no
     HAVING opening <> 0 OR added <> 0 OR taken <> 0
     ORDER BY u.buyer_no IS NULL, u.buyer_no, u.id LIMIT ?`,
    [start, start, start, end, MAX_STATEMENT_ROWS + 1]
  );
  const truncated = people.length > MAX_STATEMENT_ROWS;

  const opening = Number(open.total);
  const added = byType.reduce((n, r) => n + Number(r.added), 0);
  const taken = byType.reduce((n, r) => n + Number(r.taken), 0);
  const closing = opening + added - taken;
  const balances = Number(nowRow.balances);
  const ledger = Number(ledgerNow.total);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Summary");
  sheet.columns = [{ width: 46 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 14 }];
  const FMT = "#,##0";
  const bold = (row: ExcelJS.Row) => {
    row.font = { bold: true };
  };
  bold(sheet.addRow([`Rewards wallet statement, ${month}`]));
  sheet.addRow([`Period (UTC): ${start} to ${new Date(Date.parse(end) - 86_400_000).toISOString().slice(0, 10)}. 1 point = 1 RMB. Made ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC.`]);
  sheet.addRow([]);
  const openingRow = sheet.addRow(["Opening balance (all buyers)", opening]);
  bold(openingRow);
  sheet.addRow([]);
  bold(sheet.addRow(["Movements in the month", "Added", "Taken away", "Net", "Entries"]));
  for (const r of byType) {
    sheet.addRow([TYPE_LABELS[r.type as string] ?? r.type, Number(r.added), Number(r.taken), Number(r.added) - Number(r.taken), Number(r.entries)]);
  }
  if (byType.length === 0) sheet.addRow(["No movements in this month"]);
  bold(sheet.addRow(["Total", added, taken, added - taken, byType.reduce((n, r) => n + Number(r.entries), 0)]));
  sheet.addRow([]);
  bold(sheet.addRow(["Closing balance (all buyers)", closing]));
  sheet.addRow([]);
  bold(sheet.addRow(["Check against the buyers' balances (as of now)"]));
  sheet.addRow(["Sum of all buyers' balances now", balances]);
  sheet.addRow(["Total of all ledger entries now", ledger]);
  const diff = sheet.addRow(["Difference (0 means the books agree)", balances - ledger]);
  bold(diff);
  sheet.addRow([]);
  bold(sheet.addRow(["Money side in this month"]));
  sheet.addRow(["Withdrawals paid out (number of requests)", Number(paid.n)]);
  sheet.addRow(["Withdrawals paid out (RMB)", Number(paid.pts)]);
  sheet.addRow(["Top-ups approved (number of requests)", Number(topups.n)]);
  sheet.addRow(["Top-ups approved (RMB)", Number(topups.pts)]);
  sheet.addRow([]);
  sheet.addRow(["Withdrawal requests waiting to be paid now (number)", Number(pending.n)]);
  sheet.addRow(["...their points, already taken from the buyers' balances (RMB)", Number(pending.pts)]);
  sheet.eachRow((row) => row.eachCell((cell, col) => { if (col > 1 && typeof cell.value === "number") cell.numFmt = FMT; }));

  const detail = workbook.addWorksheet("By buyer");
  detail.columns = [
    { header: "Buyer Registration No.", key: "buyerNo", width: 22 },
    { header: "Name", key: "name", width: 26 },
    { header: "Account Email", key: "email", width: 30 },
    { header: "Opening balance", key: "opening", width: 16 },
    { header: "Added", key: "added", width: 14 },
    { header: "Taken away", key: "taken", width: 14 },
    { header: "Closing balance", key: "closing", width: 16 },
  ];
  detail.getRow(1).font = { bold: true };
  detail.views = [{ state: "frozen", ySplit: 1 }];
  people.slice(0, MAX_STATEMENT_ROWS).forEach((r) => {
    const o = Number(r.opening), a = Number(r.added), t = Number(r.taken);
    detail.addRow({ buyerNo: formatBuyerNumber(r.buyer_no), name: r.name, email: r.email, opening: o, added: a, taken: t, closing: o + a - t });
  });
  ["opening", "added", "taken", "closing"].forEach((k) => { detail.getColumn(k).numFmt = FMT; });
  return { buffer: toBuffer(await workbook.xlsx.writeBuffer()), truncated };
}

// Every referral: who invited whom, what each side was paid and for which exhibition.
export async function buildReferralsExcel(): Promise<Buffer> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT r.id, r.status, r.referrer_points, r.referred_points, r.note, r.created_at, r.rewarded_at,
            a.name AS a_name, a.buyer_no AS a_no, b.name AS b_name, b.buyer_no AS b_no, x.title AS expo_title
     FROM buyer_referrals r JOIN users a ON a.id = r.referrer_id JOIN users b ON b.id = r.referred_id
          LEFT JOIN exhibitions x ON x.id = r.exhibition_id
     ORDER BY r.id ASC LIMIT ?`,
    [MAX_MOVEMENT_ROWS]
  );
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Referrals");
  sheet.columns = [
    { header: "Referral No.", key: "id", width: 13 },
    { header: "Created (UTC)", key: "created", width: 20 },
    { header: "Status", key: "status", width: 12 },
    { header: "Inviter Registration No.", key: "aNo", width: 24 },
    { header: "Inviter", key: "aName", width: 26 },
    { header: "New buyer Registration No.", key: "bNo", width: 26 },
    { header: "New buyer", key: "bName", width: 26 },
    { header: "Points to inviter", key: "aPoints", width: 17 },
    { header: "Points to new buyer", key: "bPoints", width: 19 },
    { header: "Paid for exhibition", key: "expo", width: 34 },
    { header: "Paid (UTC)", key: "paid", width: 20 },
    { header: "Note", key: "note", width: 30 },
  ];
  sheet.getRow(1).font = { bold: true };
  rows.forEach((r) =>
    sheet.addRow({
      id: Number(r.id),
      created: when(r.created_at),
      status: r.status,
      aNo: formatBuyerNumber(r.a_no),
      aName: r.a_name,
      bNo: formatBuyerNumber(r.b_no),
      bName: r.b_name,
      aPoints: r.status === "rewarded" ? Number(r.referrer_points) : null,
      bPoints: r.status === "rewarded" ? Number(r.referred_points) : null,
      expo: r.expo_title ?? "",
      paid: when(r.rewarded_at),
      note: r.note,
    })
  );
  return toBuffer(await workbook.xlsx.writeBuffer());
}

const TICKET_STATUSES = ["pending", "approved", "rejected"];

// The train-ticket refund requests (one status, or all): the amount on the invoice, the points paid, and whether the
// e-invoice is attached yet.
export async function buildTicketRefundsExcel(status: string): Promise<Buffer> {
  const where = TICKET_STATUSES.includes(status) ? "AND c.status = ?" : "";
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT c.id, c.status, c.amount_cny, c.ticket_no, c.receipt_count, c.points_awarded, c.admin_note, c.created_at, c.reviewed_at,
            e.title AS expo_title, u.name, u.email, u.buyer_no
     FROM wallet_expense_claims c JOIN users u ON u.id = c.user_id LEFT JOIN exhibitions e ON e.id = c.exhibition_id
     WHERE c.kind = 'train' ${where} ORDER BY c.id ASC LIMIT ?`,
    [...(where ? [status] : []), MAX_MOVEMENT_ROWS]
  );
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Ticket refunds");
  sheet.columns = [
    { header: "Request No.", key: "id", width: 12 },
    { header: "Sent (UTC)", key: "created", width: 20 },
    { header: "Buyer Registration No.", key: "buyerNo", width: 22 },
    { header: "Name", key: "name", width: 26 },
    { header: "Account Email", key: "email", width: 30 },
    { header: "Exhibition", key: "expo", width: 34 },
    { header: "Amount on e-invoice (RMB)", key: "amount", width: 26 },
    { header: "E-ticket number", key: "ticketNo", width: 26 },
    { header: "E-invoice attached", key: "invoice", width: 18 },
    { header: "Status", key: "status", width: 12 },
    { header: "Points paid", key: "points", width: 13 },
    { header: "Admin note", key: "adminNote", width: 30 },
    { header: "Handled (UTC)", key: "handled", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };
  rows.forEach((r) => {
    const row = sheet.addRow({
      id: Number(r.id),
      created: when(r.created_at),
      buyerNo: formatBuyerNumber(r.buyer_no),
      name: r.name,
      email: r.email,
      expo: r.expo_title ?? "",
      amount: r.amount_cny === null ? null : Number(r.amount_cny),
      ticketNo: r.ticket_no ? String(r.ticket_no) : "",
      invoice: Number(r.receipt_count) >= 2 ? "Yes" : "No",
      status: r.status,
      points: r.points_awarded === null ? null : Number(r.points_awarded),
      adminNote: r.admin_note,
      handled: when(r.reviewed_at),
    });
    // Text, so a long ticket number is not turned into 1.2E+15.
    row.getCell("ticketNo").numFmt = "@";
  });
  return toBuffer(await workbook.xlsx.writeBuffer());
}
