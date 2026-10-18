import yauzl from "yauzl";

// Reads an .xlsx exactly as stored: no date or number-format conversion.
// Spreadsheet apps often store phone and passport numbers in cells formatted
// as dates; a normal reader would turn 13250572906 into an invalid date.
// Here every number stays a number and every string stays a string.

export type RawCell = string | number;
export interface RawSheet {
  name: string;
  hidden: boolean;
  // row number (1-based) -> column number (1-based) -> value. Empty cells are absent.
  rows: Map<number, Map<number, RawCell>>;
}

const MAX_ENTRIES = 3000;
const MAX_ENTRY_BYTES = 80 * 1024 * 1024;

function readZip(buffer: Buffer, wanted: (name: string) => boolean): Promise<Map<string, Buffer>> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) return reject(err || new Error("Not a valid .xlsx file"));
      const out = new Map<string, Buffer>();
      let count = 0;
      zip.on("error", reject);
      zip.on("end", () => resolve(out));
      zip.on("entry", (entry) => {
        if (++count > MAX_ENTRIES) return reject(new Error("Too many files inside the workbook"));
        if (!wanted(entry.fileName)) return zip.readEntry();
        if (entry.uncompressedSize > MAX_ENTRY_BYTES) return reject(new Error("A sheet inside the workbook is too large"));
        zip.openReadStream(entry, (e, stream) => {
          if (e || !stream) return reject(e || new Error("Could not read the workbook"));
          const chunks: Buffer[] = [];
          stream.on("data", (c: Buffer) => chunks.push(c));
          stream.on("error", reject);
          stream.on("end", () => {
            out.set(entry.fileName, Buffer.concat(chunks));
            zip.readEntry();
          });
        });
      });
      zip.readEntry();
    });
  });
}

function decodeXml(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    // Excel writes control characters as _x000D_
    .replace(/_x([0-9A-Fa-f]{4})_/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
}

// All <t> text of an element, ignoring phonetic hints (<rPh>).
function textOf(xml: string): string {
  const cleaned = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
  let text = "";
  const re = /<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned))) text += m[1] ?? "";
  return decodeXml(text);
}

function colNumber(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function attr(attrs: string, name: string): string | undefined {
  const m = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs);
  return m ? m[1] : undefined;
}

export async function readXlsxRaw(buffer: Buffer): Promise<RawSheet[]> {
  const files = await readZip(
    buffer,
    (n) => n === "xl/workbook.xml" || n === "xl/_rels/workbook.xml.rels" || n === "xl/sharedStrings.xml" || /^xl\/worksheets\/[^/]+\.xml$/.test(n)
  );
  const workbook = files.get("xl/workbook.xml");
  const rels = files.get("xl/_rels/workbook.xml.rels");
  if (!workbook || !rels) throw new Error("This does not look like an Excel (.xlsx) file");

  const shared: string[] = [];
  const ssXml = files.get("xl/sharedStrings.xml")?.toString("utf8");
  if (ssXml) {
    const re = /<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ssXml))) shared.push(textOf(m[1] ?? ""));
  }

  const targets = new Map<string, string>();
  const relRe = /<Relationship\b([^>]*?)\/?>/g;
  let rm: RegExpExecArray | null;
  const relsXml = rels.toString("utf8");
  while ((rm = relRe.exec(relsXml))) {
    const id = attr(rm[1], "Id");
    const target = attr(rm[1], "Target");
    if (id && target) targets.set(id, target);
  }

  const sheets: RawSheet[] = [];
  const wbXml = workbook.toString("utf8");
  const sheetRe = /<sheet\b([^>]*?)\/?>/g;
  let sm: RegExpExecArray | null;
  while ((sm = sheetRe.exec(wbXml))) {
    const name = attr(sm[1], "name");
    const rid = attr(sm[1], "r:id");
    const state = attr(sm[1], "state");
    if (!name || !rid) continue;
    let target = targets.get(rid);
    if (!target) continue;
    target = target.replace(/^\//, "");
    if (!target.startsWith("xl/")) target = `xl/${target}`;
    const xml = files.get(target)?.toString("utf8");
    const rows = new Map<number, Map<number, RawCell>>();
    if (xml) {
      const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
      let cm: RegExpExecArray | null;
      while ((cm = cellRe.exec(xml))) {
        const ref = attr(cm[1], "r");
        const refm = ref ? /^([A-Z]+)(\d+)$/.exec(ref) : null;
        if (!refm || cm[2] === undefined) continue;
        const type = attr(cm[1], "t");
        const inner = cm[2];
        let value: RawCell | undefined;
        if (type === "inlineStr") {
          value = textOf(inner);
        } else {
          const vm = /<v\b[^>]*?>([\s\S]*?)<\/v>/.exec(inner);
          if (!vm) continue;
          const raw = vm[1];
          if (type === "s") value = shared[Number(raw)] ?? "";
          else if (type === "str" || type === "e" || type === "b" || type === "d") value = decodeXml(raw);
          else {
            const num = Number(raw);
            value = Number.isFinite(num) ? num : decodeXml(raw);
          }
        }
        if (value === undefined || value === "") continue;
        const r = Number(refm[2]);
        const c = colNumber(refm[1]);
        let row = rows.get(r);
        if (!row) rows.set(r, (row = new Map()));
        row.set(c, value);
      }
    }
    sheets.push({ name: decodeXml(name), hidden: state === "hidden" || state === "veryHidden", rows });
  }
  return sheets;
}
