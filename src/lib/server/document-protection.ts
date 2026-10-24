import type { RowDataPacket } from "mysql2/promise";
import { queryRaw } from "@/lib/db";
import { activeKeyId, openAll, protectDataUrl, protectInlineDataUrls } from "@/lib/server/document-crypto";

// Admin -> Document protection: how many stored documents are encrypted, and encrypting the ones that were stored before a key was set.
// Reads and writes here use the raw database access, because they must see what is really stored (the normal access opens
// protected values on the way out and would hide the difference).

interface Source {
  key: string;
  table: string;
  column: string;
  /** A column of text with data URLs inside it (JSON answers, a list of receipts) rather than one data URL. */
  inline?: boolean;
  /** The primary key columns, to find the row again. */
  pk: string[];
}

export const PROTECTED_SOURCES: Source[] = [
  ...["doc_passport_front", "doc_visa_page", "doc_business_license", "doc_business_card", "doc_buyer_photo", "doc_canton_fair_card", "doc_invoice_order_list", "doc_latest_entry_stamp"].map(
    (c): Source => ({ key: `profile.${c}`, table: "buyer_profiles", column: c, pk: ["id"] })
  ),
  { key: "custom.data", table: "buyer_custom_documents", column: "data", pk: ["user_id", "item_key"] },
  ...["doc_passport_front", "doc_business_card", "doc_visa_page", "doc_business_license", "doc_order_list", "doc_ticket"].map(
    (c): Source => ({ key: `registration.${c}`, table: "expo_registrations", column: c, pk: ["id"] })
  ),
  { key: "registration.custom_answers", table: "expo_registrations", column: "custom_answers", inline: true, pk: ["id"] },
  { key: "tour.custom_answers", table: "tour_registrations", column: "custom_answers", inline: true, pk: ["id"] },
  { key: "wallet.topup_proof", table: "wallet_topups", column: "proof", pk: ["id"] },
  { key: "wallet.expense_receipts", table: "wallet_expense_claims", column: "receipts", inline: true, pk: ["id"] },
  { key: "wallet.payout_qr", table: "wallet_withdrawals", column: "qr_image", pk: ["id"] },
];

const unprotectedWhere = (s: Source) => (s.inline ? `(\`${s.column}\` LIKE '%data:image/%' OR \`${s.column}\` LIKE '%data:application/pdf%')` : `\`${s.column}\` LIKE 'data:%'`);
const protectedWhere = (s: Source) => (s.inline ? `\`${s.column}\` LIKE '%enc:v1:%'` : `\`${s.column}\` LIKE 'enc:v1:%'`);

function missing(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  return code === "ER_NO_SUCH_TABLE" || code === "ER_BAD_FIELD_ERROR";
}

export interface ProtectionStatus {
  configured: boolean;
  keyId: string | null;
  sources: { key: string; protected: number; unprotected: number }[];
  protectedTotal: number;
  unprotectedTotal: number;
}

export async function getProtectionStatus(): Promise<ProtectionStatus> {
  const sources: ProtectionStatus["sources"] = [];
  for (const s of PROTECTED_SOURCES) {
    try {
      const [rows] = (await queryRaw(
        `SELECT SUM(${protectedWhere(s)}) AS p, SUM(${unprotectedWhere(s)}) AS u FROM \`${s.table}\``
      )) as [RowDataPacket[], unknown];
      sources.push({ key: s.key, protected: Number(rows[0]?.p ?? 0), unprotected: Number(rows[0]?.u ?? 0) });
    } catch (err) {
      if (!missing(err)) throw err;
    }
  }
  return {
    configured: activeKeyId() !== null,
    keyId: activeKeyId(),
    sources,
    protectedTotal: sources.reduce((n, s) => n + s.protected, 0),
    unprotectedTotal: sources.reduce((n, s) => n + s.unprotected, 0),
  };
}

export interface BatchOutcome {
  /** Documents encrypted by this call. */
  protectedNow: number;
  /** Documents that could not be encrypted safely (they stay as they were). */
  failed: number;
  /** Documents still not encrypted (after this call). */
  remaining: number;
  /** Which ones failed, to be passed back so the next call leaves them alone. */
  failedKeys: string[];
}

const BATCH = 10;

/** Encrypts the next few documents that are still stored as they were uploaded. Safe to repeat; each one is checked by opening it again before it replaces the original. */
export async function protectNextBatch(skip: Set<string>): Promise<BatchOutcome> {
  const out: BatchOutcome = { protectedNow: 0, failed: 0, remaining: 0, failedKeys: [] };
  if (activeKeyId() === null) throw new Error("no_key");
  for (const s of PROTECTED_SOURCES) {
    let rows: RowDataPacket[];
    try {
      const skipSql = skip.size > 0 ? ` AND CONCAT_WS(':', ${s.pk.map((c) => `\`${c}\``).join(", ")}) NOT IN (${[...skip].filter((k) => k.startsWith(`${s.key}|`)).map(() => "?").join(", ") || "''"})` : "";
      const skipParams = [...skip].filter((k) => k.startsWith(`${s.key}|`)).map((k) => k.slice(s.key.length + 1));
      [rows] = (await queryRaw(
        `SELECT ${s.pk.map((c) => `\`${c}\``).join(", ")}, \`${s.column}\` AS v FROM \`${s.table}\` WHERE ${unprotectedWhere(s)}${skipSql} LIMIT ${BATCH}`,
        skipParams
      )) as [RowDataPacket[], unknown];
    } catch (err) {
      if (missing(err)) continue;
      throw err;
    }
    if (rows.length === 0) continue;
    for (const row of rows) {
      const original = typeof row.v === "string" ? row.v : JSON.stringify(row.v);
      const idText = s.pk.map((c) => String(row[c])).join(":");
      const replaced = s.inline ? protectInlineDataUrls(original) : protectDataUrl(original);
      // Only replace the original when opening the new copy gives back exactly the original.
      const roundTrip = openAll(replaced);
      if (replaced === original || roundTrip !== original) {
        out.failed += 1;
        skip.add(`${s.key}|${idText}`);
        out.failedKeys.push(`${s.key}|${idText}`);
        continue;
      }
      await queryRaw(`UPDATE \`${s.table}\` SET \`${s.column}\` = ? WHERE ${s.pk.map((c) => `\`${c}\` = ?`).join(" AND ")}`, [replaced, ...s.pk.map((c) => row[c])]);
      out.protectedNow += 1;
    }
    break; // one source at a time keeps each call small
  }
  const status = await getProtectionStatus();
  out.remaining = Math.max(0, status.unprotectedTotal - skip.size);
  return out;
}
