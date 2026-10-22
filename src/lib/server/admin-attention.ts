import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

export interface AttentionCounts {
  registrations: number;
  tourRegistrations: number;
  topups: number;
  withdrawals: number;
  expenses: number;
  documents: number;
}

async function count(sql: string): Promise<number> {
  try {
    const [[row]] = await pool.query<RowDataPacket[]>(sql);
    return Number(row?.n ?? 0);
  } catch {
    // A table a deploy has not created yet counts as nothing waiting, never as an error on the admin home.
    return 0;
  }
}

const DOC_COLUMNS = [
  "passport_front", "visa_page", "business_license", "business_card", "buyer_photo", "canton_fair_card", "invoice_order_list", "latest_entry_stamp",
];

// What is waiting for an admin, in one place: the numbers on "Needs attention" on the admin home.
export async function getAttentionCounts(): Promise<AttentionCounts> {
  // A buyer's uploaded documents still waiting for review (an upload counts as verified unless an admin set it back).
  const docSql = DOC_COLUMNS.map((c) => `(SELECT COUNT(*) FROM buyer_profiles WHERE has_doc_${c} = 1 AND doc_${c}_status = 'pending')`).join(" + ");
  const [registrations, tourRegistrations, topups, withdrawals, expenses, builtinDocs, customDocs] = await Promise.all([
    count("SELECT COUNT(*) AS n FROM expo_registrations WHERE status = 'pending'"),
    count("SELECT COUNT(*) AS n FROM tour_registrations WHERE status = 'pending'"),
    count("SELECT COUNT(*) AS n FROM wallet_topups WHERE status = 'pending'"),
    count("SELECT COUNT(*) AS n FROM wallet_withdrawals WHERE status = 'pending'"),
    count("SELECT COUNT(*) AS n FROM wallet_expense_claims WHERE status = 'pending'"),
    count(`SELECT ${docSql} AS n`),
    count("SELECT COUNT(*) AS n FROM buyer_custom_documents WHERE status = 'pending'"),
  ]);
  return { registrations, tourRegistrations, topups, withdrawals, expenses, documents: builtinDocs + customDocs };
}
