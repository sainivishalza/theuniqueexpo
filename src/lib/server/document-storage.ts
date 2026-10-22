import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { formTablesReady } from "@/lib/server/buyer-form-repo";
import { shrinkDocumentDataUrl } from "@/lib/server/document-image";

// Documents uploaded before pictures were shrunk on upload (see document-image.ts) can be several MB each.
// This reports how much space buyer documents take and shrinks the large ones in small batches, so an
// admin can run it from Buyer form settings without a developer. Only files over LARGE_BYTES are looked
// at; the review status and note of a document are never touched.

// Longest data URL left alone: a 1600 px JPEG is usually under this.
export const LARGE_BYTES = 300_000;

// Built-in document columns of buyer_profiles, then the table for documents an admin added.
const BUILTIN_COLUMNS = [
  "doc_passport_front",
  "doc_visa_page",
  "doc_business_license",
  "doc_business_card",
  "doc_buyer_photo",
  "doc_canton_fair_card",
  "doc_invoice_order_list",
  "doc_latest_entry_stamp",
] as const;
const CUSTOM_SOURCE = BUILTIN_COLUMNS.length; // the index after the last built-in column

export interface StorageStats {
  files: number;
  totalBytes: number;
  largeFiles: number;
  largeBytes: number;
}

export async function documentStorageStats(): Promise<StorageStats> {
  const stats: StorageStats = { files: 0, totalBytes: 0, largeFiles: 0, largeBytes: 0 };
  const add = (rows: RowDataPacket[]) => {
    stats.files += Number(rows[0]?.files ?? 0);
    stats.totalBytes += Number(rows[0]?.bytes ?? 0);
    stats.largeFiles += Number(rows[0]?.large_files ?? 0);
    stats.largeBytes += Number(rows[0]?.large_bytes ?? 0);
  };
  for (const col of BUILTIN_COLUMNS) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS files, COALESCE(SUM(LENGTH(${col})), 0) AS bytes,
              COALESCE(SUM(LENGTH(${col}) > ?), 0) AS large_files,
              COALESCE(SUM(CASE WHEN LENGTH(${col}) > ? THEN LENGTH(${col}) ELSE 0 END), 0) AS large_bytes
       FROM buyer_profiles WHERE ${col} IS NOT NULL AND ${col} <> ''`,
      [LARGE_BYTES, LARGE_BYTES]
    );
    add(rows);
  }
  if (await formTablesReady()) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS files, COALESCE(SUM(LENGTH(data)), 0) AS bytes,
              COALESCE(SUM(LENGTH(data) > ?), 0) AS large_files,
              COALESCE(SUM(CASE WHEN LENGTH(data) > ? THEN LENGTH(data) ELSE 0 END), 0) AS large_bytes
       FROM buyer_custom_documents WHERE data <> ''`,
      [LARGE_BYTES, LARGE_BYTES]
    );
    add(rows);
  }
  return stats;
}

export interface ShrinkCursor {
  source: number; // index into BUILTIN_COLUMNS, or CUSTOM_SOURCE
  afterUserId: number;
}

export interface ShrinkResult {
  done: boolean;
  cursor: ShrinkCursor;
  checked: number;
  shrunk: number;
  savedBytes: number;
  failed: number;
}

const BATCH = 8;

// Checks up to BATCH large files starting at the cursor. Call again with the returned cursor until done.
export async function shrinkStoredDocuments(cursor: ShrinkCursor = { source: 0, afterUserId: 0 }): Promise<ShrinkResult> {
  const result: ShrinkResult = { done: false, cursor, checked: 0, shrunk: 0, savedBytes: 0, failed: 0 };
  let { source, afterUserId } = cursor;

  while (result.checked < BATCH) {
    if (source > CUSTOM_SOURCE || (source === CUSTOM_SOURCE && !(await formTablesReady()))) {
      result.done = true;
      break;
    }
    const want = BATCH - result.checked;
    let rows: RowDataPacket[];
    if (source < CUSTOM_SOURCE) {
      const col = BUILTIN_COLUMNS[source];
      [rows] = await pool.query<RowDataPacket[]>(
        `SELECT user_id, ${col} AS data FROM buyer_profiles
         WHERE user_id > ? AND ${col} IS NOT NULL AND LENGTH(${col}) > ? ORDER BY user_id LIMIT ?`,
        [afterUserId, LARGE_BYTES, want]
      );
    } else {
      // A buyer can have several large custom documents: take whole buyers, so the cursor never splits one.
      const [users] = await pool.query<RowDataPacket[]>(
        `SELECT DISTINCT user_id FROM buyer_custom_documents WHERE user_id > ? AND LENGTH(data) > ? ORDER BY user_id LIMIT ?`,
        [afterUserId, LARGE_BYTES, want]
      );
      if (users.length === 0) {
        rows = [];
      } else {
        [rows] = await pool.query<RowDataPacket[]>(
          `SELECT user_id, item_key, data FROM buyer_custom_documents
           WHERE user_id IN (?) AND LENGTH(data) > ? ORDER BY user_id, item_key`,
          [users.map((u) => u.user_id), LARGE_BYTES]
        );
      }
    }
    if (rows.length === 0) {
      source += 1;
      afterUserId = 0;
      continue;
    }
    for (const row of rows) {
      result.checked += 1;
      afterUserId = Number(row.user_id);
      const before = String(row.data);
      try {
        const after = await shrinkDocumentDataUrl(before);
        if (after.length >= before.length) continue;
        if (source < CUSTOM_SOURCE) {
          await pool.query(`UPDATE buyer_profiles SET ${BUILTIN_COLUMNS[source]} = ? WHERE user_id = ?`, [after, row.user_id]);
        } else {
          await pool.query("UPDATE buyer_custom_documents SET data = ? WHERE user_id = ? AND item_key = ?", [after, row.user_id, row.item_key]);
        }
        result.shrunk += 1;
        result.savedBytes += before.length - after.length;
      } catch {
        result.failed += 1;
      }
    }
  }
  result.cursor = { source, afterUserId };
  return result;
}
