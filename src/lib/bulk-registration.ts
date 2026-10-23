// Registering for several exhibitions at once from the buyer dashboard. Shared by the server and the screen.
//
// Every exhibition asks for some details: the standard sign-up form, or a form its organiser wrote. Most of
// that is already in the buyer's profile; what is not is asked once, for all the chosen exhibitions together,
// and then kept on the profile so it is never asked twice.

export type QuestionKind = "text" | "textarea" | "select" | "radio" | "checkbox" | "file";

export interface PlanQuestion {
  /** "core:companyScale" (the standard form) or "custom:<question>|<type>|<options>" (an organiser's own question). */
  key: string;
  kind: QuestionKind;
  /** The standard form's questions are named by the screen from this; an organiser's own carry their own text. */
  core?: string;
  label?: string;
  help?: string;
  required: boolean;
  options?: string[];
  /** The answer on file (empty when there is none). Never a file: see hasFile. */
  value: string | string[];
  /** A file is already saved for this question (it is kept unless a new one is chosen). */
  hasFile?: boolean;
  /** Only asked when another answer says so (the "please specify" after "Other"). */
  showIf?: { key: string; equals?: string; includes?: string };
  /** The exhibitions (slugs) that need it. */
  exhibitions: string[];
  /** Where the answer is kept: a field of the buyer profile, or the saved answers on it. */
  savedTo: "profile" | "saved";
}

export interface PlanExhibition {
  slug: string;
  title: string;
  /** "new", or why it is left out. */
  state: "new" | "resubmit" | "already_registered" | "closed" | "unknown";
}

/** A detail that is already known (the buyer's profile or earlier answers): shown, not asked. */
export interface PlanKnown {
  key: string;
  core?: string;
  label?: string;
  kind: QuestionKind;
  /** The text (or the choices, joined) that will be sent; absent for a file. */
  text?: string;
  /** A file is on the profile and will be sent. */
  file?: boolean;
  /** The exhibitions (slugs) it goes to. */
  exhibitions: string[];
}

export interface Plan {
  exhibitions: PlanExhibition[];
  questions: PlanQuestion[];
  known: PlanKnown[];
}

export type SubmitOutcome = "registered" | "registered_again" | "already_registered" | "closed" | "unknown" | "failed";

export interface SubmitResult {
  slug: string;
  title: string;
  outcome: SubmitOutcome;
  /** Registered, but every place is taken: the buyer is on the waiting list. */
  waitlisted?: boolean;
  error?: string;
}

export const MAX_EXHIBITIONS_AT_ONCE = 40;

/** A question's text reduced to lower-case words, so "Company  Name:" and "company name" are the same question. */
export function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** A short fingerprint of a list of choices (two questions with different choices are different questions). */
export function optionsFingerprint(options: string[] | undefined): string {
  const text = (options ?? []).map((o) => normalizeLabel(o)).join("|");
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function customQuestionKey(label: string, type: string, options: string[] | undefined): string {
  const base = `custom:${normalizeLabel(label).slice(0, 120)}|${type}`;
  return type === "radio" || type === "checkbox" ? `${base}|${optionsFingerprint(options)}` : base;
}

export const isFileQuestion = (kind: QuestionKind) => kind === "file";

// ----- exhibitions on the same days -----

export interface DatedExhibition {
  slug: string;
  title: string;
  startDate: string;
  endDate: string;
  /** The buyer's own registration for it, if any. */
  status?: string | null;
}

// A registration that still holds a place (cancelled, rejected and absent ones do not).
const HOLDS_A_PLACE = new Set(["pending", "approved", "confirmed", "attended"]);

const day = (value: string) => (/^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : "");

/**
 * For each exhibition the buyer ticked: the other exhibitions held on some of the same days, whether ticked as
 * well or already registered for. Only exhibitions with a known date take part; an end date of its own is optional.
 */
export function findOverlaps(all: DatedExhibition[], chosen: ReadonlySet<string>): Map<string, { title: string; registered: boolean }[]> {
  const out = new Map<string, { title: string; registered: boolean }[]>();
  const span = (e: DatedExhibition) => {
    const start = day(e.startDate);
    const end = day(e.endDate) || start;
    return start ? { start, end: end < start ? start : end } : null;
  };
  for (const a of all) {
    if (!chosen.has(a.slug)) continue;
    const sa = span(a);
    if (!sa) continue;
    const clashes: { title: string; registered: boolean }[] = [];
    for (const b of all) {
      if (b.slug === a.slug) continue;
      const registered = !chosen.has(b.slug) && !!b.status && HOLDS_A_PLACE.has(b.status);
      if (!chosen.has(b.slug) && !registered) continue;
      const sb = span(b);
      if (sb && sa.start <= sb.end && sb.start <= sa.end) clashes.push({ title: b.title, registered });
    }
    if (clashes.length > 0) out.set(a.slug, clashes);
  }
  return out;
}
