import { randomBytes } from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";
import {
  defaultFormItems,
  FIELD_TYPES,
  MAX_CUSTOM_DOCUMENTS,
  MAX_CUSTOM_FIELDS,
  MAX_LABEL_LENGTH,
  MAX_LONGTEXT_VALUE,
  MAX_OPTION_LENGTH,
  MAX_OPTIONS,
  MAX_TEXT_VALUE,
  type FieldType,
  type FormItem,
  type FormItemKind,
  type FormLabels,
} from "@/lib/buyer-form";

// The list of documents and extra information fields a buyer is asked for, and what buyers gave
// for the ones an admin added. The eight built-in documents keep their files in the
// buyer_profiles columns (see buyer-profile-repo.ts); everything an admin adds lives in
// buyer_form_items / buyer_custom_documents / buyer_custom_values (migration 059).

export type FormErrorCode = "invalid_input" | "not_found" | "limit" | "in_use" | "options_mismatch" | "not_ready" | "builtin";

export class FormError extends Error {
  code: FormErrorCode;
  status: number;
  constructor(code: FormErrorCode, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

// The site can go live a few minutes before the deploy job has applied migration 059. Until the
// tables exist the app carries on with the built-in documents in their default order (nothing
// can be added or changed yet). Once found, never asked again; while missing, looked at again
// at most every 30 seconds.
let tablesFound = false;
let tablesCheckedAt = 0;

export async function formTablesReady(): Promise<boolean> {
  if (tablesFound) return true;
  if (Date.now() - tablesCheckedAt < 30_000) return false;
  tablesCheckedAt = Date.now();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS n FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name IN ('buyer_form_items','buyer_custom_documents','buyer_custom_values')`
  );
  tablesFound = Number(rows[0]?.n) === 3;
  return tablesFound;
}

function lines(value: unknown): string[] {
  return typeof value === "string" && value !== "" ? value.split("\n") : [];
}

function toItem(r: RowDataPacket): FormItem {
  return {
    key: r.item_key as string,
    kind: r.kind as FormItemKind,
    builtin: !!r.builtin,
    labels: { en: r.label_en as string, ru: (r.label_ru as string) || "", zh: (r.label_zh as string) || "" },
    position: Number(r.position),
    active: !!r.active,
    required: !!r.required,
    fieldType: (r.field_type as FieldType | null) ?? null,
    options: { en: lines(r.options_en), ru: lines(r.options_ru), zh: lines(r.options_zh) },
  };
}

// A few seconds of cache: the list is read on almost every buyer-profile request.
let cache: { items: FormItem[]; at: number } | null = null;
const CACHE_MS = 5_000;

export function invalidateFormCache(): void {
  cache = null;
}

/** Every item, shown or hidden: documents first, then fields, each in its own order. */
export async function getFormItems(): Promise<FormItem[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.items;
  let items: FormItem[];
  if (await formTablesReady()) {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM buyer_form_items ORDER BY kind, position, id");
    items = rows.map(toItem);
    // A database that has the table but not the seed (should not happen) still shows the built-ins.
    if (!items.some((i) => i.kind === "document")) items = [...defaultFormItems(), ...items];
  } else {
    items = defaultFormItems();
  }
  cache = { items, at: Date.now() };
  return items;
}

export async function getActiveFormItems(): Promise<FormItem[]> {
  return (await getFormItems()).filter((i) => i.active);
}

export async function findFormItem(key: string): Promise<FormItem | null> {
  return (await getFormItems()).find((i) => i.key === key) ?? null;
}

// ---------- admin: change the list ----------

export interface FormItemInput {
  labels?: Partial<FormLabels>;
  required?: boolean;
  active?: boolean;
  fieldType?: unknown;
  options?: { en?: unknown; ru?: unknown; zh?: unknown };
}

function cleanLabel(value: unknown, required: boolean): string {
  const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (text.length > MAX_LABEL_LENGTH) throw new FormError("invalid_input");
  if (required && !text) throw new FormError("invalid_input");
  return text;
}

function cleanOptions(value: unknown): string[] {
  if (value === undefined || value === null || value === "") return [];
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split("\n") : null;
  if (!raw) throw new FormError("invalid_input");
  const out = raw.map((o) => (typeof o === "string" ? o.trim().replace(/\s+/g, " ") : "")).filter(Boolean);
  if (out.length > MAX_OPTIONS || out.some((o) => o.length > MAX_OPTION_LENGTH)) throw new FormError("invalid_input");
  return out;
}

// English choices are the master list; Russian and Chinese either match it one for one or are left empty.
function cleanChoiceSet(input: FormItemInput["options"]): { en: string[]; ru: string[]; zh: string[] } {
  const en = cleanOptions(input?.en);
  const ru = cleanOptions(input?.ru);
  const zh = cleanOptions(input?.zh);
  if (en.length < 2 || new Set(en).size !== en.length) throw new FormError("invalid_input");
  if ((ru.length && ru.length !== en.length) || (zh.length && zh.length !== en.length)) throw new FormError("options_mismatch");
  return { en, ru, zh };
}

function newKey(): string {
  return `c_${randomBytes(4).toString("hex")}`;
}

export async function createFormItem(kind: FormItemKind, input: FormItemInput): Promise<FormItem> {
  if (!(await formTablesReady())) throw new FormError("not_ready", 503);
  const labels = { en: cleanLabel(input.labels?.en, true), ru: cleanLabel(input.labels?.ru, false), zh: cleanLabel(input.labels?.zh, false) };
  let fieldType: FieldType | null = null;
  let options = { en: [] as string[], ru: [] as string[], zh: [] as string[] };
  if (kind === "field") {
    if (typeof input.fieldType !== "string" || !(FIELD_TYPES as string[]).includes(input.fieldType)) throw new FormError("invalid_input");
    fieldType = input.fieldType as FieldType;
    if (fieldType === "choice") options = cleanChoiceSet(input.options);
  }
  const existing = await getFormItems();
  const ofKind = existing.filter((i) => i.kind === kind);
  if (ofKind.filter((i) => !i.builtin).length >= (kind === "document" ? MAX_CUSTOM_DOCUMENTS : MAX_CUSTOM_FIELDS)) throw new FormError("limit");
  const position = (ofKind.length ? Math.max(...ofKind.map((i) => i.position)) : 0) + 10;
  const key = newKey();
  await pool.query(
    `INSERT INTO buyer_form_items (item_key, kind, builtin, label_en, label_ru, label_zh, position, active, required, field_type, options_en, options_ru, options_zh)
     VALUES (?, ?, 0, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
    [
      key, kind, labels.en, labels.ru, labels.zh, position,
      kind === "document" ? (input.required === false ? 0 : 1) : 0,
      fieldType,
      options.en.length ? options.en.join("\n") : null,
      options.ru.length ? options.ru.join("\n") : null,
      options.zh.length ? options.zh.join("\n") : null,
    ]
  );
  invalidateFormCache();
  return (await findFormItem(key)) as FormItem;
}

export async function updateFormItem(key: string, input: FormItemInput): Promise<FormItem> {
  if (!(await formTablesReady())) throw new FormError("not_ready", 503);
  const item = await findFormItem(key);
  if (!item) throw new FormError("not_found", 404);
  const sets: string[] = [];
  const params: unknown[] = [];
  if (input.labels) {
    const en = input.labels.en !== undefined ? cleanLabel(input.labels.en, true) : item.labels.en;
    sets.push("label_en = ?", "label_ru = ?", "label_zh = ?");
    params.push(
      en,
      input.labels.ru !== undefined ? cleanLabel(input.labels.ru, false) : item.labels.ru,
      input.labels.zh !== undefined ? cleanLabel(input.labels.zh, false) : item.labels.zh
    );
  }
  if (typeof input.active === "boolean") {
    sets.push("active = ?");
    params.push(input.active ? 1 : 0);
  }
  if (typeof input.required === "boolean" && item.kind === "document") {
    sets.push("required = ?");
    params.push(input.required ? 1 : 0);
  }
  if (input.options && item.kind === "field" && item.fieldType === "choice") {
    const set = cleanChoiceSet(input.options);
    sets.push("options_en = ?", "options_ru = ?", "options_zh = ?");
    params.push(set.en.join("\n"), set.ru.length ? set.ru.join("\n") : null, set.zh.length ? set.zh.join("\n") : null);
  }
  if (sets.length === 0) return item;
  await pool.query(`UPDATE buyer_form_items SET ${sets.join(", ")} WHERE item_key = ?`, [...params, key]);
  invalidateFormCache();
  return (await findFormItem(key)) as FormItem;
}

// Swaps places with the neighbouring item of the same kind (hidden ones included, so what the
// admin sees on the settings page is what moves).
export async function moveFormItem(key: string, direction: "up" | "down"): Promise<void> {
  if (!(await formTablesReady())) throw new FormError("not_ready", 503);
  const items = await getFormItems();
  const item = items.find((i) => i.key === key);
  if (!item) throw new FormError("not_found", 404);
  const same = items.filter((i) => i.kind === item.kind).sort((a, b) => a.position - b.position);
  const index = same.findIndex((i) => i.key === key);
  const other = same[direction === "up" ? index - 1 : index + 1];
  if (!other) return;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Positions are not unique in the database, so give the whole list fresh 10-step positions first.
    const order = same.map((i) => i.key);
    const otherIndex = direction === "up" ? index - 1 : index + 1;
    order[index] = other.key;
    order[otherIndex] = key;
    for (let n = 0; n < order.length; n++) await conn.query("UPDATE buyer_form_items SET position = ? WHERE item_key = ?", [(n + 1) * 10, order[n]]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  invalidateFormCache();
}

/** Does any buyer have something saved for this item? (Decides whether it can be deleted or only hidden.) */
export async function formItemInUse(item: FormItem): Promise<boolean> {
  if (item.builtin) return true;
  const table = item.kind === "document" ? "buyer_custom_documents" : "buyer_custom_values";
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT 1 AS used FROM ${table} WHERE item_key = ? LIMIT 1`, [item.key]);
  return rows.length > 0;
}

// Only items an admin added can be deleted, and only while nobody has filled them in; otherwise hide
// them (what buyers gave is never thrown away by accident).
export async function deleteFormItem(key: string): Promise<void> {
  if (!(await formTablesReady())) throw new FormError("not_ready", 503);
  const item = await findFormItem(key);
  if (!item) throw new FormError("not_found", 404);
  if (item.builtin) throw new FormError("builtin");
  if (await formItemInUse(item)) throw new FormError("in_use", 409);
  await pool.query<ResultSetHeader>("DELETE FROM buyer_form_items WHERE item_key = ? AND builtin = 0", [key]);
  invalidateFormCache();
}

// ---------- documents an admin added ----------

export type CustomReviewStatus = "pending" | "verified" | "rejected";

/** Upload state and review per document, without the files themselves. */
export async function getCustomDocumentStates(userIds?: number[]): Promise<Map<number, Record<string, { status: CustomReviewStatus; note: string }>>> {
  const out = new Map<number, Record<string, { status: CustomReviewStatus; note: string }>>();
  if (!(await formTablesReady())) return out;
  const where = userIds ? `WHERE user_id IN (${userIds.length ? userIds.map(() => "?").join(",") : "NULL"})` : "";
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT user_id, item_key, status, note FROM buyer_custom_documents ${where}`, userIds ?? []);
  for (const r of rows) {
    const bucket = out.get(r.user_id as number) ?? {};
    bucket[r.item_key as string] = { status: r.status as CustomReviewStatus, note: (r.note as string) || "" };
    out.set(r.user_id as number, bucket);
  }
  return out;
}

/** The files (for the Excel / ZIP exports). */
export async function getCustomDocumentData(userIds: number[]): Promise<Map<number, Record<string, string>>> {
  const out = new Map<number, Record<string, string>>();
  if (!userIds.length || !(await formTablesReady())) return out;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id, item_key, data FROM buyer_custom_documents WHERE user_id IN (${userIds.map(() => "?").join(",")})`,
    userIds
  );
  for (const r of rows) {
    const bucket = out.get(r.user_id as number) ?? {};
    bucket[r.item_key as string] = r.data as string;
    out.set(r.user_id as number, bucket);
  }
  return out;
}

export async function getCustomDocument(userId: number, key: string): Promise<string | null> {
  if (!(await formTablesReady())) return null;
  const [rows] = await pool.query<RowDataPacket[]>("SELECT data FROM buyer_custom_documents WHERE user_id = ? AND item_key = ? LIMIT 1", [userId, key]);
  return (rows[0]?.data as string | undefined) || null;
}

// Like the built-in documents: a new upload is verified straight away and clears an old rejection reason.
export async function setCustomDocument(userId: number, key: string, dataUrl: string): Promise<void> {
  if (!(await formTablesReady())) throw new FormError("not_ready", 503);
  await pool.query(
    `INSERT INTO buyer_custom_documents (user_id, item_key, data, status, note) VALUES (?, ?, ?, 'verified', '')
     ON DUPLICATE KEY UPDATE data = VALUES(data), status = 'verified', note = ''`,
    [userId, key, dataUrl]
  );
}

export async function setCustomDocumentReview(userId: number, key: string, status: CustomReviewStatus, note: string): Promise<void> {
  if (!(await formTablesReady())) throw new FormError("not_ready", 503);
  await pool.query("UPDATE buyer_custom_documents SET status = ?, note = ? WHERE user_id = ? AND item_key = ?", [status, note, userId, key]);
}

// ---------- extra information fields an admin added ----------

export async function getCustomValues(userIds?: number[]): Promise<Map<number, Record<string, string>>> {
  const out = new Map<number, Record<string, string>>();
  if (!(await formTablesReady())) return out;
  const where = userIds ? `WHERE user_id IN (${userIds.length ? userIds.map(() => "?").join(",") : "NULL"})` : "";
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT user_id, item_key, value FROM buyer_custom_values ${where}`, userIds ?? []);
  for (const r of rows) {
    const bucket = out.get(r.user_id as number) ?? {};
    bucket[r.item_key as string] = r.value as string;
    out.set(r.user_id as number, bucket);
  }
  return out;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** A value that fits the field, or null when it does not. An empty string clears the answer. */
export function cleanFieldValue(item: FormItem, value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text === "") return "";
  switch (item.fieldType) {
    case "text":
      return text.length <= MAX_TEXT_VALUE ? text : null;
    case "longtext":
      return text.length <= MAX_LONGTEXT_VALUE ? text : null;
    case "date":
      return validDate(text) ? text : null;
    case "choice":
      return item.options.en.includes(text) ? text : null;
    default:
      return null;
  }
}

// Saves answers to the shown extra fields. A field that is not there any more (hidden or removed
// since the page was opened) is skipped; a value that does not fit its field is refused, and then
// nothing at all is saved.
export async function setCustomValues(userId: number, values: Record<string, unknown>): Promise<void> {
  const entries = Object.entries(values);
  if (entries.length === 0) return;
  const items = (await getActiveFormItems()).filter((i) => i.kind === "field" && !i.builtin);
  const toSave: [string, string][] = [];
  for (const [key, raw] of entries) {
    const item = items.find((i) => i.key === key);
    if (!item) continue;
    const clean = cleanFieldValue(item, raw);
    if (clean === null) throw new FormError("invalid_input");
    toSave.push([key, clean]);
  }
  if (toSave.length === 0) return;
  if (!(await formTablesReady())) throw new FormError("not_ready", 503);
  for (const [key, value] of toSave) {
    if (value === "") await pool.query("DELETE FROM buyer_custom_values WHERE user_id = ? AND item_key = ?", [userId, key]);
    else await pool.query("INSERT INTO buyer_custom_values (user_id, item_key, value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", [userId, key, value]);
  }
}
