import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

// Pictures an admin uploads for the website (posters, galleries, covers, team photos) are kept in the database as data URLs. A
// phone photo can be several megabytes, which slows every list and the backups. They are resized and recompressed here when
// they are saved, and the same work can be run once over the pictures already stored (Admin -> Pictures).

const MAX_SIDE = 1800;
const QUALITY = 82;
/** Pictures at or below this size and within MAX_SIDE are left exactly as uploaded. */
const SMALL_BYTES = 150 * 1024;
/** A re-encoded picture must be at least this much smaller to replace the original. */
const MIN_GAIN = 0.1;
/** Bigger than this (about 25 MB of picture) is not worked on at all. */
const MAX_INPUT_CHARS = 34_000_000;

const DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/]+=*)$/i;

type SharpFn = typeof import("sharp").default;
let sharpPromise: Promise<SharpFn | null> | null = null;
function loadSharp(): Promise<SharpFn | null> {
  sharpPromise ??= import("sharp")
    .then((m) => (m.default ?? m) as SharpFn)
    .catch((err) => {
      console.error("sharp is not available; website pictures are stored as uploaded:", err);
      return null;
    });
  return sharpPromise;
}

export interface OptimizeResult {
  value: string;
  before: number;
  after: number;
  changed: boolean;
}

const same = (value: string, bytes: number): OptimizeResult => ({ value, before: bytes, after: bytes, changed: false });

/** The size in bytes of the picture inside a data URL (0 for a plain link or anything else). */
export function dataUrlBytes(value: string): number {
  const m = DATA_URL_RE.exec(value);
  return m ? Math.floor((m[2].length * 3) / 4) - (m[2].match(/=+$/)?.[0].length ?? 0) : 0;
}

/**
 * Returns the picture to store. Links, GIFs and anything that cannot be read are returned untouched; a picture that is
 * already small is kept; otherwise it is resized to fit MAX_SIDE and recompressed, and kept only if that is clearly smaller.
 */
export async function optimizeSiteImage(value: string): Promise<OptimizeResult> {
  const m = DATA_URL_RE.exec(value);
  if (!m) return same(value, 0);
  if (m[2].length > MAX_INPUT_CHARS) return same(value, 0);
  const input = Buffer.from(m[2], "base64");
  const sharp = await loadSharp();
  if (!sharp) return same(value, input.length);
  try {
    const image = sharp(input, { failOn: "error", limitInputPixels: 100_000_000 });
    const meta = await image.metadata();
    const big = (meta.width ?? 0) > MAX_SIDE || (meta.height ?? 0) > MAX_SIDE;
    if (!big && input.length <= SMALL_BYTES) return same(value, input.length);
    const pipeline = sharp(input, { failOn: "error", limitInputPixels: 100_000_000 }).rotate().resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true });
    // A picture with see-through parts stays a PNG (JPEG would turn them black); everything else becomes a JPEG.
    const hasAlpha = !!meta.hasAlpha && meta.format !== "jpeg";
    const output = hasAlpha ? await pipeline.png({ compressionLevel: 9, palette: true, quality: 80 }).toBuffer() : await pipeline.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
    if (output.length > input.length * (1 - MIN_GAIN)) return same(value, input.length);
    return { value: `data:image/${hasAlpha ? "png" : "jpeg"};base64,${output.toString("base64")}`, before: input.length, after: output.length, changed: true };
  } catch {
    return same(value, input.length);
  }
}

/** Optimises named fields (and lists of pictures) of a request body in place, before it is validated and saved. */
export async function optimizeImageFields(body: Record<string, unknown>, fields: string[], listFields: string[] = []): Promise<void> {
  for (const f of fields) {
    if (typeof body[f] === "string" && (body[f] as string).startsWith("data:")) body[f] = (await optimizeSiteImage(body[f] as string)).value;
  }
  for (const f of listFields) {
    const list = body[f];
    if (Array.isArray(list)) body[f] = await Promise.all(list.map(async (v) => (typeof v === "string" && v.startsWith("data:") ? (await optimizeSiteImage(v)).value : v)));
  }
}

// ----- the pictures already stored -----

interface Source {
  table: string;
  column: string;
  /** A column holding a JSON list of pictures instead of one. */
  list?: boolean;
}

export const IMAGE_SOURCES: Source[] = [
  { table: "exhibitions", column: "image" },
  { table: "exhibitions", column: "gallery_images", list: true },
  { table: "tours", column: "image" },
  { table: "tours", column: "gallery_images", list: true },
  { table: "events", column: "image" },
  { table: "blog_posts", column: "cover_image" },
  { table: "team_members", column: "photo" },
  { table: "homepage_slideshow_photos", column: "image" },
  { table: "magazine_issues", column: "cover_image" },
];

const BATCH = 12;

export interface BatchResult {
  /** Where to continue ("source index:last id"), null when everything has been looked at. */
  next: string | null;
  scanned: number;
  changed: number;
  before: number;
  after: number;
  /** Pictures that stayed as they were because the new copy was not clearly smaller. */
  kept: number;
}

/** Looks at (and with apply = true, replaces) the next few stored pictures. Safe to repeat: pictures already optimised are kept. */
export async function optimizeStoredBatch(cursor: string | null, apply: boolean): Promise<BatchResult> {
  const [srcIndexText, lastIdText] = (cursor ?? "0:0").split(":");
  let srcIndex = Number(srcIndexText) || 0;
  let lastId = Number(lastIdText) || 0;
  const result: BatchResult = { next: null, scanned: 0, changed: 0, before: 0, after: 0, kept: 0 };
  while (srcIndex < IMAGE_SOURCES.length) {
    const src = IMAGE_SOURCES[srcIndex];
    let rows: RowDataPacket[];
    try {
      [rows] = await pool.query<RowDataPacket[]>(
        `SELECT id, ${src.column} AS v FROM ${src.table} WHERE id > ? AND ${src.column} LIKE '${src.list ? "%" : ""}data:image/%' AND LENGTH(${src.column}) > ? ORDER BY id LIMIT ?`,
        [lastId, Math.ceil((SMALL_BYTES * 4) / 3), BATCH]
      );
    } catch (err) {
      // A table or column that does not exist on this site yet: nothing to do for it.
      const code = (err as { code?: string }).code;
      if (code !== "ER_NO_SUCH_TABLE" && code !== "ER_BAD_FIELD_ERROR") throw err;
      rows = [];
    }
    if (rows.length === 0) {
      srcIndex += 1;
      lastId = 0;
      continue;
    }
    for (const row of rows) {
      lastId = Number(row.id);
      // A column that holds JSON comes back from the driver already parsed.
      const original = typeof row.v === "string" ? row.v : JSON.stringify(row.v);
      let next = original;
      let before = 0;
      let after = 0;
      if (src.list) {
        let list: unknown = row.v;
        if (typeof list === "string") {
          try { list = JSON.parse(list); } catch { list = null; }
        }
        if (!Array.isArray(list)) continue;
        const out: unknown[] = [];
        for (const item of list) {
          if (typeof item === "string" && item.startsWith("data:")) {
            const r = await optimizeSiteImage(item);
            before += r.before; after += r.after;
            out.push(r.value);
          } else out.push(item);
        }
        next = JSON.stringify(out);
      } else {
        const r = await optimizeSiteImage(original);
        before = r.before; after = r.after;
        next = r.value;
      }
      result.scanned += 1;
      result.before += before;
      result.after += after;
      if (next !== original) {
        result.changed += 1;
        if (apply) await pool.query(`UPDATE ${src.table} SET ${src.column} = ? WHERE id = ?`, [next, row.id]);
      } else result.kept += 1;
    }
    result.next = `${srcIndex}:${lastId}`;
    return result;
  }
  return result;
}

/** How big the stored pictures are now (MB per source), for the admin screen. */
export async function storedImageSizes(): Promise<{ table: string; column: string; count: number; bytes: number }[]> {
  const out: { table: string; column: string; count: number; bytes: number }[] = [];
  for (const src of IMAGE_SOURCES) {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS n, COALESCE(SUM(LENGTH(${src.column})), 0) AS bytes FROM ${src.table} WHERE ${src.column} LIKE '${src.list ? "%" : ""}data:image/%'`);
      out.push({ table: src.table, column: src.column, count: Number(rows[0].n), bytes: Math.floor((Number(rows[0].bytes) * 3) / 4) });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "ER_NO_SUCH_TABLE" && code !== "ER_BAD_FIELD_ERROR") throw err;
    }
  }
  return out;
}
