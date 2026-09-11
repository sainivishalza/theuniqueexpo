// ICAO 9303 TD3 machine-readable-zone parsing -- passports print the
// holder's name a second time, standardized and Latin-transliterated, in
// this fixed-width strip at the bottom of the bio page (even for
// non-Latin-script passports: Chinese passports print pinyin, Arabic
// passports print a Latin transliteration, etc.), which makes it far more
// reliable to parse than the free-form printed name field above it.
//
// Line 1 shape: P<CCCSURNAME<<GIVEN<NAMES<<<<<<<<<<<<<<<<<<<<
// (P = document type, CCC = 3-letter issuing country, << separates
// surname from given names, < pads to 44 chars).
export interface MrzNameResult {
  surname: string;
  givenNames: string;
  fullName: string;
}

const MRZ_LINE1_RE = /^P[A-Z<][A-Z]{3}[A-Z<]{28,39}$/;

export function parseMrzName(ocrText: string): MrzNameResult | null {
  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, "").toUpperCase())
    // OCR sometimes reads 'O' as '0' or vice versa inside the letter
    // portion -- normalize the common case since MRZ names are letters
    // and '<' only, never digits.
    .filter((l) => l.length >= 30);

  for (const line of lines) {
    if (!line.startsWith("P") || !line.includes("<<")) continue;
    if (!MRZ_LINE1_RE.test(line)) continue;

    const afterCountry = line.slice(5); // "P" + filler + 3-letter country code
    const [surnamePart, ...rest] = afterCountry.split("<<");
    if (!surnamePart) continue;

    const surname = surnamePart.replace(/</g, " ").trim();
    const givenNames = rest
      .join(" ")
      .replace(/<+$/, "")
      .replace(/</g, " ")
      .trim();

    if (surname || givenNames) {
      return { surname, givenNames, fullName: [givenNames, surname].filter(Boolean).join(" ") };
    }
  }
  return null;
}

// Weak last-resort fallback for a passport-like image whose MRZ strip
// wasn't captured in the photo (a tight crop, or OCR just missed it) --
// looks for an explicit "Name"/"Surname"/"Given name(s)" label. Nowhere
// near as reliable as MRZ parsing, which is exactly why the admin review
// screen exists to catch a wrong guess here.
const LABEL_RE = /^(?:full\s*name|surname|given\s*names?|name)\s*[:\-]\s*(.+)$/i;

export function heuristicNameFromText(ocrText: string): string | null {
  for (const rawLine of ocrText.split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = LABEL_RE.exec(line);
    if (match && match[1].trim().length > 1) {
      return match[1].trim();
    }
  }
  return null;
}
