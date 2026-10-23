// Fields an admin can put in an announcement: {name}, {number} and {exhibition}. Each reader gets their own values.
// Shared by the server (which fills them when sending) and the dialog (which previews them), so both agree.

export const ANNOUNCEMENT_FIELDS = ["name", "number", "exhibition"] as const;
export type AnnouncementField = (typeof ANNOUNCEMENT_FIELDS)[number];
export type FieldValues = Record<AnnouncementField, string>;

const FIELD_RE = /\{([A-Za-z_]+)\}/g;

/** What to write for {exhibition} when a reader has no upcoming registration. */
export const NO_EXHIBITION: Record<"en" | "ru" | "zh", string> = {
  en: "your exhibition",
  ru: "ваша выставка",
  zh: "您的展会",
};

/** A value is one line of plain text: no line breaks (they would break an e-mail subject) or control characters. */
export function cleanValue(value: unknown): string {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}

export function usesFields(text: string): boolean {
  FIELD_RE.lastIndex = 0;
  for (let m = FIELD_RE.exec(text); m; m = FIELD_RE.exec(text)) if ((ANNOUNCEMENT_FIELDS as readonly string[]).includes(m[1])) return true;
  return false;
}

/** Puts the reader's values in place of {name}, {number} and {exhibition}. Anything else in braces is left as typed. */
export function fillFields(text: string, values: FieldValues): string {
  return text.replace(FIELD_RE, (whole, key: string) => ((ANNOUNCEMENT_FIELDS as readonly string[]).includes(key) ? values[key as AnnouncementField] : whole));
}

/** Words in braces that are not one of the fields (probably a typo), without repeats. */
export function unknownFields(text: string): string[] {
  const found = new Set<string>();
  FIELD_RE.lastIndex = 0;
  for (let m = FIELD_RE.exec(text); m; m = FIELD_RE.exec(text)) if (!(ANNOUNCEMENT_FIELDS as readonly string[]).includes(m[1])) found.add(m[0]);
  return [...found];
}
