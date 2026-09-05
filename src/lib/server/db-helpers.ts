import type { CustomFormSchema } from "@/lib/custom-registration-form";

// Raw DB values come back loosely typed (mysql2 doesn't know the table
// schema) -- these helpers centralize the loose-to-safe conversions repo
// mapRow functions need, so each repo isn't retyping the same conversions.

export function toDateOnlyString(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().split("T")[0];
}

export function toIsoTimestamp(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

export function formatDateRange(start: string | Date, end: string | Date): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" };
  if (s.getMonth() === e.getMonth()) {
    return `${s.toLocaleDateString("en-US", opts)}–${e.getDate()}, ${e.getFullYear()}`;
  }
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", opts)}, ${e.getFullYear()}`;
}

export function safeParseArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Registration form schemas/answers are stored as free-form JSON -- callers
// narrow the result to whatever shape they expect.
export function safeParseJson(value: unknown): unknown {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// Custom-answer file uploads carry large base64 blobs -- strip them from
// summary rows, keyed off the field types in the schema snapshot.
export function stripFileAnswers(customAnswers: unknown, formSchemaSnapshot: unknown): unknown {
  if (!customAnswers || typeof customAnswers !== "object" || !Array.isArray(formSchemaSnapshot)) {
    return customAnswers;
  }
  const schema = formSchemaSnapshot as CustomFormSchema;
  const fileFieldIds = new Set(schema.filter((f) => f.type === "file").map((f) => f.id));
  if (fileFieldIds.size === 0) return customAnswers;
  const stripped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(customAnswers as Record<string, unknown>)) {
    stripped[key] = fileFieldIds.has(key) ? (value ? true : value) : value;
  }
  return stripped;
}
