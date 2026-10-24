import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Identity documents (passport pages, visas, licences, e-tickets, receipts, payout QR codes) are kept in the database as data URLs.
// With a key set (DOCUMENT_ENCRYPTION_KEY) they are stored encrypted (AES-256-GCM), so a copy of the database, a backup file or a
// database mistake does not expose them; the website decrypts them as it reads, so nothing else in the code changes.
//
//   stored form:  enc:v1:<key id>:<mime, URL-encoded>:<base64 of iv (12) + tag (16) + encrypted file>
//
// Without a key nothing is encrypted and nothing breaks. A document that was encrypted can only be opened with the key that
// encrypted it: when the key is changed, put the old one in DOCUMENT_ENCRYPTION_OLD_KEYS (comma separated) so old documents can
// still be read, then run "Protect documents" again. NEVER lose the key: without it the encrypted documents cannot be recovered.

const PREFIX = "enc:v1:";
const TOKEN_RE = /enc:v1:[0-9a-f]{8}:[A-Za-z0-9%._-]+:[A-Za-z0-9+/]+=*/g;
const DATA_URL_RE = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+=*)$/i;
// A data URL inside text (a JSON answer to a file question).
const INLINE_DATA_URL_RE = /data:(?:image\/(?:jpeg|jpg|png|webp|gif)|application\/pdf);base64,[A-Za-z0-9+/]+=*/g;

interface Key { id: string; bytes: Buffer }
let cache: { primary: Key | null; all: Map<string, Key>; signature: string } | null = null;

function deriveKey(secret: string): Key {
  const s = secret.trim();
  const bytes = /^[0-9a-fA-F]{64}$/.test(s) ? Buffer.from(s, "hex") : createHash("sha256").update(s).digest();
  return { id: createHash("sha256").update(bytes).digest("hex").slice(0, 8), bytes };
}

function keys() {
  const primarySecret = process.env.DOCUMENT_ENCRYPTION_KEY ?? "";
  const oldSecrets = process.env.DOCUMENT_ENCRYPTION_OLD_KEYS ?? "";
  const signature = `${primarySecret}|${oldSecrets}`;
  if (cache && cache.signature === signature) return cache;
  const primary = primarySecret.trim().length >= 16 ? deriveKey(primarySecret) : null;
  const all = new Map<string, Key>();
  if (primary) all.set(primary.id, primary);
  for (const secret of oldSecrets.split(",")) {
    if (secret.trim().length >= 16) {
      const k = deriveKey(secret);
      all.set(k.id, k);
    }
  }
  cache = { primary, all, signature };
  return cache;
}

/** The short id of the key now in use (for the admin screen, so the right key can be confirmed), or null when no key is set. */
export function activeKeyId(): string | null {
  return keys().primary?.id ?? null;
}

export function isEncryptedDocument(value: unknown): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

function encryptBytes(mime: string, bytes: Buffer, key: Key): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key.bytes, iv);
  const body = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return `${PREFIX}${key.id}:${encodeURIComponent(mime.toLowerCase())}:${Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64")}`;
}

/** A data URL becomes its protected form; anything else (or no key set, or already protected) comes back unchanged. */
export function protectDataUrl(value: string): string {
  const { primary } = keys();
  if (!primary) return value;
  const m = DATA_URL_RE.exec(value);
  if (!m) return value;
  return encryptBytes(m[1], Buffer.from(m[2], "base64"), primary);
}

/** Protects every data URL written inside a text (JSON answers to file questions). */
export function protectInlineDataUrls(text: string): string {
  if (!keys().primary || !text.includes("data:")) return text;
  return text.replace(INLINE_DATA_URL_RE, (m) => protectDataUrl(m));
}

function openToken(token: string): string | null {
  const parts = token.slice(PREFIX.length).split(":");
  if (parts.length !== 3) return null;
  const key = keys().all.get(parts[0]);
  if (!key) return null;
  try {
    const raw = Buffer.from(parts[2], "base64");
    if (raw.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", key.bytes, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const bytes = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]);
    return `data:${decodeURIComponent(parts[1])};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

let warned = false;
function cannotOpen(): void {
  if (warned) return;
  warned = true;
  console.error("A stored document is encrypted and cannot be opened: DOCUMENT_ENCRYPTION_KEY (or DOCUMENT_ENCRYPTION_OLD_KEYS) does not hold the key it was encrypted with.");
}

/** The readable data URL of a protected document; the value itself when it is not protected, or when it cannot be opened. */
export function openDocument(value: string): string {
  if (!value.startsWith(PREFIX)) return value;
  const opened = openToken(value);
  if (opened === null) cannotOpen();
  return opened ?? value;
}

/** Opens protected documents anywhere in a value read from the database (a text, a parsed JSON object, a list), in place when possible. */
export function openAll<T>(value: T): T {
  if (typeof value === "string") {
    if (value.startsWith(PREFIX)) return openDocument(value) as T;
    if (value.length > 40 && value.includes(PREFIX)) return value.replace(TOKEN_RE, (t) => openToken(t) ?? t) as T;
    return value;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = openAll(value[i]);
    return value;
  }
  if (value !== null && typeof value === "object" && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    const o = value as Record<string, unknown>;
    for (const k of Object.keys(o)) o[k] = openAll(o[k]);
  }
  return value;
}

/** Protects the data URLs among the values given to a statement that writes to a table of documents. */
export function protectParams<T>(value: T): T {
  if (!keys().primary) return value;
  if (typeof value === "string") {
    if (value.startsWith("data:")) return protectDataUrl(value) as T;
    if (value.length > 100 && value.includes("data:") ) return protectInlineDataUrls(value) as T;
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => protectParams(v)) as T;
  return value;
}

/** Tables whose columns hold documents (or text with documents in it): writes to them are protected. */
export const DOCUMENT_TABLES = ["buyer_profiles", "buyer_custom_documents", "expo_registrations", "tour_registrations", "wallet_expense_claims", "wallet_topups", "wallet_withdrawals"];
const WRITE_RE = new RegExp(`\\b(?:INSERT\\s+(?:IGNORE\\s+)?INTO|UPDATE|REPLACE\\s+INTO)\\s+\`?(?:${DOCUMENT_TABLES.join("|")})\`?\\b`, "i");

export function writesDocumentTable(sql: string): boolean {
  return WRITE_RE.test(sql);
}
