import pool, { isDuplicateEntryError } from "@/lib/db";
import {
  COMPANY_SCALES, COMPANY_TYPES, EXPORTING_MARKETS, INFO_SOURCES, NATIONALITIES, PURPOSES_OF_VISIT,
  validateExpoRegistration, type ExpoRegistrationInput,
} from "@/lib/expo-registrations";
import { validateCustomAnswers, type CustomFormField, type CustomFormSchema } from "@/lib/custom-registration-form";
import { isPlaceholderEmail } from "@/lib/login-id";
import { isValidUploadedDocument } from "@/lib/server/validate-upload";
import { shrinkDocumentDataUrl } from "@/lib/server/document-image";
import { canRegisterAgain } from "@/lib/registration-lifecycle";
import {
  customQuestionKey, normalizeLabel, MAX_EXHIBITIONS_AT_ONCE,
  type Plan, type PlanExhibition, type PlanKnown, type PlanQuestion, type QuestionKind, type SubmitOutcome, type SubmitResult,
} from "@/lib/bulk-registration";
import { listExhibitions } from "@/lib/server/exhibitions-repo";
import {
  getBuyerDocument, getBuyerProfileOrEmpty, setBuyerDocument, upsertBuyerProfileFields,
  type BuyerProfile, type BuyerProfileFields,
} from "@/lib/server/buyer-profile-repo";
import { getExtraValue, listExtraInfo, saveExtraInfo, type ExtraInfoRow } from "@/lib/server/buyer-extra-info";
import { createCustomExpoRegistration, createExpoRegistration, rewriteRegistration } from "@/lib/server/expo-registrations-repo";
import { upgradeReferralStatus } from "@/lib/server/partner-referrals-repo";

// ---------------------------------------------------------------------------------------------------------
// What an exhibition asks for, and where each answer comes from: the buyer's profile first, then what they
// answered before, and only then the buyer is asked. Nothing is written until the whole set is valid.
// ---------------------------------------------------------------------------------------------------------

type ProfileField = Exclude<keyof BuyerProfileFields, "sourceExhibitions" | "registrationCode">;
type Answers = Record<string, unknown>;

export interface Person {
  id: number;
  name: string;
  email: string;
}

interface Q extends PlanQuestion {
  /** Shown on the screen (false: the answer is already known and used silently). */
  visible: boolean;
  profileField?: ProfileField;
  /** The profile document this question's file comes from / goes to. */
  docKey?: string;
  /** Known without asking (from the profile). */
  known?: string | string[];
  /** For a custom question: the form field of each exhibition (slug -> field). */
  fields: Record<string, CustomFormField>;
  maxLength: number;
  email?: boolean;
}

// The most each profile field can hold (the column sizes), so a longer answer is refused instead of cut.
const PROFILE_LIMITS: Partial<Record<ProfileField, number>> = {
  gender: 50, nationality: 100, passportNumber: 100, phoneNumber: 50, contactEmail: 255, companyName: 255,
  jobTitle: 255, wechatId: 255, dateOfBirth: 50, overseasCompanyAddress: 500, passportName: 255,
};

interface CoreDef {
  field: string;
  kind: QuestionKind;
  options?: readonly string[];
  profileField?: ProfileField;
  docKey?: string;
  showIf?: { field: string; equals?: string; includes?: string };
  email?: boolean;
}

// The standard sign-up form, in the order it is asked.
const CORE: CoreDef[] = [
  { field: "gender", kind: "radio", options: ["male", "female"], profileField: "gender" },
  { field: "nationality", kind: "select", options: NATIONALITIES, profileField: "nationality" },
  { field: "passportNumber", kind: "text", profileField: "passportNumber" },
  { field: "phone", kind: "text", profileField: "phoneNumber" },
  { field: "email", kind: "text", profileField: "contactEmail", email: true },
  { field: "companyName", kind: "text", profileField: "companyName" },
  { field: "companyType", kind: "select", options: COMPANY_TYPES },
  { field: "companyTypeOther", kind: "text", showIf: { field: "companyType", equals: "Other" } },
  { field: "companyScale", kind: "select", options: COMPANY_SCALES },
  { field: "purposeOfVisit", kind: "select", options: PURPOSES_OF_VISIT },
  { field: "infoSource", kind: "select", options: INFO_SOURCES },
  { field: "infoSourceOther", kind: "text", showIf: { field: "infoSource", equals: "Other" } },
  { field: "exportingMarkets", kind: "checkbox", options: EXPORTING_MARKETS },
  { field: "exportingMarketOther", kind: "text", showIf: { field: "exportingMarkets", includes: "Other" } },
  { field: "docPassportFront", kind: "file", docKey: "passportFront" },
  { field: "docBusinessCard", kind: "file", docKey: "businessCard" },
  { field: "docVisaPage", kind: "file", docKey: "visaPage" },
  { field: "docBusinessLicense", kind: "file", docKey: "businessLicense" },
];

// An organiser's own question is recognised as a profile field only when its words say so unmistakably.
const TEXT_LABELS: Record<string, ProfileField | "fullName" | "email"> = {
  "company name": "companyName", "name of company": "companyName", "company": "companyName", "company name in english": "companyName",
  "full name": "fullName", "name": "fullName", "your name": "fullName", "name as in passport": "passportName", "name in passport": "passportName",
  "phone": "phoneNumber", "phone number": "phoneNumber", "mobile": "phoneNumber", "mobile number": "phoneNumber", "telephone": "phoneNumber", "tel": "phoneNumber",
  "email": "email", "e mail": "email", "email address": "email", "e mail address": "email",
  "nationality": "nationality", "passport number": "passportNumber", "passport no": "passportNumber", "passport": "passportNumber",
  "job title": "jobTitle", "position": "jobTitle", "wechat": "wechatId", "wechat id": "wechatId",
  "company address": "overseasCompanyAddress", "date of birth": "dateOfBirth", "birth date": "dateOfBirth", "dob": "dateOfBirth",
};
const FILE_LABELS: Record<string, string> = {
  "passport": "passportFront", "passport copy": "passportFront", "passport front page": "passportFront", "passport photo": "passportFront", "passport scan": "passportFront",
  "business card": "businessCard", "visa": "visaPage", "visa page": "visaPage", "business license": "businessLicense", "business licence": "businessLicense",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const today = () => new Date().toISOString().slice(0, 10);

const asList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function canonicalOption(options: readonly string[] | undefined, value: string): string {
  if (!options) return value;
  const found = options.find((o) => o.toLowerCase() === value.toLowerCase());
  return found ?? "";
}

// ----- what is already known -----

interface Context {
  user: Person;
  profile: BuyerProfile;
  saved: Map<string, ExtraInfoRow>;
}

async function loadContext(user: Person): Promise<Context> {
  const [profile, saved] = await Promise.all([getBuyerProfileOrEmpty(user.id), listExtraInfo(user.id)]);
  return { user, profile, saved: new Map(saved.map((r) => [r.key, r])) };
}

function profileText(ctx: Context, field: ProfileField | "fullName" | "email"): string {
  if (field === "fullName") return ctx.profile.passportName.trim() || ctx.user.name.trim();
  if (field === "email") return (!isPlaceholderEmail(ctx.user.email) && ctx.user.email.trim()) || ctx.profile.contactEmail.trim();
  return String(ctx.profile[field] ?? "").trim();
}

/** The answer saved earlier for this question, if it still fits the question. */
function savedAnswer(ctx: Context, key: string, kind: QuestionKind, options?: readonly string[]): string | string[] | null {
  const row = ctx.saved.get(key);
  if (!row) return null;
  if (kind === "file") return row.hasFile ? "" : null;
  if (kind === "checkbox") {
    try {
      const list = asList(JSON.parse(row.value));
      const ok = list.filter((x) => !options || options.includes(x));
      return ok.length ? ok : null;
    } catch {
      return null;
    }
  }
  if (!row.value.trim()) return null;
  if (kind === "select" || kind === "radio") {
    const c = canonicalOption(options, row.value.trim());
    return c || null;
  }
  return row.value;
}

// ----- the questions -----

interface Built {
  exhibitions: PlanExhibition[];
  active: { slug: string; id: number; title: string; schema: CustomFormSchema | null; state: "new" | "resubmit"; existingId?: number }[];
  questions: Q[];
}

async function build(ctx: Context, slugs: string[], locale?: string): Promise<Built> {
  const all = await listExhibitions(locale);
  const bySlug = new Map(all.map((e) => [e.slug, e]));
  const [regRows] = await pool.query<import("mysql2/promise").RowDataPacket[]>("SELECT id, exhibition_id, status FROM expo_registrations WHERE user_id = ?", [ctx.user.id]);
  const mine = new Map(regRows.map((r) => [Number(r.exhibition_id), { id: Number(r.id), status: String(r.status) }]));

  const exhibitions: PlanExhibition[] = [];
  const active: Built["active"] = [];
  for (const slug of slugs) {
    const e = bySlug.get(slug);
    if (!e) { exhibitions.push({ slug, title: slug, state: "unknown" }); continue; }
    const existing = mine.get(Number(e.id));
    let state: PlanExhibition["state"] = "new";
    if (existing && !canRegisterAgain(existing.status as never)) state = "already_registered";
    else if (!e.registrationEnabled || (e.endDate && e.endDate < today())) state = "closed";
    else if (existing) state = "resubmit";
    exhibitions.push({ slug, title: e.title, state });
    if (state === "new" || state === "resubmit") {
      const schema = Array.isArray(e.registrationFormSchema) && e.registrationFormSchema.length > 0 ? (e.registrationFormSchema as CustomFormSchema) : null;
      active.push({ slug, id: Number(e.id), title: e.title, schema, state, existingId: existing?.id });
    }
  }

  const questions: Q[] = [];
  const byKey = new Map<string, Q>();

  // The standard form (shared by every exhibition that uses it).
  const standard = active.filter((a) => !a.schema).map((a) => a.slug);
  if (standard.length > 0) {
    for (const def of CORE) {
      const key = `core:${def.field}`;
      const q: Q = {
        key, kind: def.kind, core: def.field, required: true, options: def.options ? [...def.options] : undefined, value: def.kind === "checkbox" ? [] : "",
        showIf: def.showIf ? { key: `core:${def.showIf.field}`, equals: def.showIf.equals, includes: def.showIf.includes } : undefined,
        exhibitions: standard, savedTo: def.profileField || def.docKey ? "profile" : "saved",
        visible: true, profileField: def.profileField, docKey: def.docKey, fields: {}, maxLength: def.profileField ? PROFILE_LIMITS[def.profileField] ?? 1000 : 1000, email: def.email,
      };
      resolveInto(ctx, q, def.profileField === "contactEmail" ? "email" : def.profileField);
      questions.push(q);
      byKey.set(key, q);
    }
  }

  // The organisers' own forms.
  for (const a of active) {
    if (!a.schema) continue;
    for (const field of a.schema) {
      const key = customQuestionKey(field.label, field.type, field.options);
      let q = byKey.get(key);
      if (!q) {
        const kind: QuestionKind = field.type === "radio" ? "radio" : field.type === "checkbox" ? "checkbox" : field.type === "textarea" ? "textarea" : field.type === "file" ? "file" : "text";
        const norm = normalizeLabel(field.label);
        const textTarget = kind === "text" ? TEXT_LABELS[norm] : undefined;
        const docKey = kind === "file" ? FILE_LABELS[norm] : undefined;
        q = {
          key, kind, label: field.label, help: field.helpText, required: false, options: field.options, value: kind === "checkbox" ? [] : "",
          exhibitions: [], savedTo: textTarget || docKey ? "profile" : "saved",
          visible: true, profileField: textTarget === "email" ? "contactEmail" : textTarget && textTarget !== "fullName" ? textTarget : undefined, docKey, fields: {},
          maxLength: kind === "textarea" ? 5000 : 1000, email: textTarget === "email",
        };
        (q as Q & { dictionary?: string }).dictionary = textTarget;
        resolveInto(ctx, q, textTarget);
        questions.push(q);
        byKey.set(key, q);
      }
      q.required = q.required || !!field.required;
      if (!q.help && field.helpText) q.help = field.helpText;
      q.exhibitions.push(a.slug);
      q.fields[a.slug] = field;
    }
  }
  return { exhibitions, active, questions };
}

// Fills in what is known for a question: from the profile, else from the saved answers.
function resolveInto(ctx: Context, q: Q, source: ProfileField | "fullName" | "email" | undefined): void {
  const fromProfile = source ? profileText(ctx, source) : "";
  if (q.docKey) {
    if (ctx.profile.hasDocument[q.docKey]) {
      q.visible = false;
      q.known = "";
      return;
    }
    const s = savedAnswer(ctx, q.key, "file");
    q.hasFile = s !== null;
    return;
  }
  if (source && fromProfile) {
    const fit = q.kind === "select" || q.kind === "radio" ? canonicalOption(q.options, fromProfile) : fromProfile;
    if (fit) {
      q.visible = false;
      q.known = fit;
      return;
    }
  }
  const s = savedAnswer(ctx, q.key, q.kind, q.options);
  if (source && s !== null && typeof s === "string" && s) {
    // A profile field with no usable value but a saved answer: the saved answer is used silently.
    q.visible = false;
    q.known = s;
    return;
  }
  if (s !== null) q.value = s;
}

// ----- the public pieces -----

export interface ListedExhibition {
  slug: string;
  title: string;
  startDate: string;
  endDate: string;
  dates: string;
  venue: string;
  city: string;
  country: string;
  industry: string;
  description: string;
  image: string;
  /** null when the buyer has no registration for it. */
  status: string | null;
  canRegister: boolean;
}

/** The upcoming exhibitions open for registration, each with where this buyer stands. */
export async function listRegistrable(userId: number, locale?: string): Promise<ListedExhibition[]> {
  const all = await listExhibitions(locale);
  const [rows] = await pool.query<import("mysql2/promise").RowDataPacket[]>("SELECT exhibition_id, status FROM expo_registrations WHERE user_id = ?", [userId]);
  const mine = new Map(rows.map((r) => [Number(r.exhibition_id), String(r.status)]));
  const t = today();
  return all
    .filter((e) => e.registrationEnabled && (!e.endDate || e.endDate >= t))
    .map((e) => {
      const status = mine.get(Number(e.id)) ?? null;
      return {
        slug: e.slug, title: e.title, startDate: e.startDate ?? "", endDate: e.endDate ?? "", dates: e.dates, venue: e.venue, city: e.city, country: e.country,
        industry: e.industry, description: (e.description || "").slice(0, 280), image: e.image || "",
        status, canRegister: status === null || canRegisterAgain(status as never),
      };
    });
}

function clientQuestion(q: Q): PlanQuestion {
  return {
    key: q.key, kind: q.kind, core: q.core, label: q.label, help: q.help, required: q.required, options: q.options,
    value: q.value, hasFile: q.hasFile, showIf: q.showIf, exhibitions: q.exhibitions, savedTo: q.savedTo,
  };
}

/** What is needed to register for these exhibitions: which are possible and the questions to put to the buyer. */
export async function planRegistrations(user: Person, slugs: string[], locale?: string): Promise<Plan> {
  const ctx = await loadContext(user);
  const built = await build(ctx, slugs, locale);
  const known: PlanKnown[] = [];
  const standard = built.active.filter((a) => !a.schema).map((a) => a.slug);
  const fullName = profileText(ctx, "fullName");
  if (standard.length > 0 && fullName) known.push({ key: "core:fullName", core: "fullName", kind: "text", text: fullName, exhibitions: standard });
  for (const q of built.questions) {
    if (q.visible || q.exhibitions.length === 0) continue;
    const base = { key: q.key, core: q.core, label: q.label, kind: q.kind, exhibitions: q.exhibitions };
    if (q.kind === "file") known.push({ ...base, file: true });
    else known.push({ ...base, text: Array.isArray(q.known) ? q.known.join(", ") : String(q.known ?? "") });
  }
  return { exhibitions: built.exhibitions, questions: built.questions.filter((q) => q.visible).map(clientQuestion), known };
}

// ----- submitting -----

export type SubmitError =
  | { code: "invalid"; keys: string[]; message: string }
  | { code: "missing"; keys: string[]; message: string }
  | { code: "invalid_file"; keys: string[]; message: string }
  | { code: "form"; message: string; slug: string };

export type SubmitResponse = { results: SubmitResult[]; error?: undefined } | { error: SubmitError };

interface Value {
  text?: string;
  list?: string[];
  file?: string;
}

async function currentValue(ctx: Context, q: Q, answers: Answers): Promise<{ value: Value; fromProfile: boolean; provided: boolean }> {
  const given = answers[q.key];
  if (q.kind === "file") {
    if (typeof given === "string" && given) return { value: { file: given }, fromProfile: false, provided: true };
    if (q.docKey && ctx.profile.hasDocument[q.docKey]) return { value: { file: (await getBuyerDocument(ctx.user.id, q.docKey)) ?? "" }, fromProfile: true, provided: false };
    if (q.hasFile) return { value: { file: (await getExtraValue(ctx.user.id, q.key)) ?? "" }, fromProfile: false, provided: false };
    return { value: {}, fromProfile: false, provided: false };
  }
  if (!q.visible) {
    return { value: Array.isArray(q.known) ? { list: q.known } : { text: String(q.known ?? "") }, fromProfile: true, provided: false };
  }
  if (q.kind === "checkbox") {
    if (given !== undefined) return { value: { list: asList(given) }, fromProfile: false, provided: true };
    return { value: { list: Array.isArray(q.value) ? q.value : [] }, fromProfile: false, provided: false };
  }
  if (given !== undefined) return { value: { text: text(given) }, fromProfile: false, provided: true };
  return { value: { text: typeof q.value === "string" ? q.value : "" }, fromProfile: false, provided: false };
}

const hasValue = (v: Value) => !!(v.text || v.list?.length || v.file);

function conditionMet(q: Q, values: Map<string, Value>): boolean {
  if (!q.showIf) return true;
  const parent = values.get(q.showIf.key);
  if (!parent) return false;
  if (q.showIf.equals !== undefined) return parent.text === q.showIf.equals;
  if (q.showIf.includes !== undefined) return !!parent.list?.includes(q.showIf.includes);
  return true;
}

export async function submitRegistrations(user: Person, slugs: string[], answers: Answers, locale?: string): Promise<SubmitResponse> {
  const ctx = await loadContext(user);
  const built = await build(ctx, slugs, locale);

  const results: SubmitResult[] = built.exhibitions
    .filter((e) => e.state !== "new" && e.state !== "resubmit")
    .map((e) => ({ slug: e.slug, title: e.title, outcome: (e.state === "already_registered" ? "already_registered" : e.state === "closed" ? "closed" : "unknown") as SubmitOutcome }));
  if (built.active.length === 0) return { results };

  // 1. every answer, from the buyer or from what is known
  const values = new Map<string, Value>();
  const provided = new Map<string, boolean>();
  for (const q of built.questions) {
    const r = await currentValue(ctx, q, answers);
    values.set(q.key, r.value);
    provided.set(q.key, r.provided);
  }

  // 2. each one fits its question
  const invalid: string[] = [];
  const missing: string[] = [];
  const badFile: string[] = [];
  for (const q of built.questions) {
    const v = values.get(q.key)!;
    if (!conditionMet(q, values)) { values.set(q.key, {}); continue; }
    if (!hasValue(v)) {
      if (q.required) missing.push(q.key);
      continue;
    }
    if (q.kind === "file") {
      if (!isValidUploadedDocument(v.file)) badFile.push(q.key);
      continue;
    }
    if (q.kind === "checkbox") {
      if (!v.list || (q.options && v.list.some((x) => !q.options!.includes(x)))) invalid.push(q.key);
      continue;
    }
    const t = v.text ?? "";
    if (q.kind === "select" || q.kind === "radio") {
      const c = q.options ? canonicalOption(q.options, t) : t;
      if (!c) invalid.push(q.key);
      else v.text = c;
      continue;
    }
    if (t.length > q.maxLength) invalid.push(q.key);
    else if (q.email && !EMAIL_RE.test(t)) invalid.push(q.key);
  }
  if (badFile.length) return { error: { code: "invalid_file", keys: badFile, message: "One of the files is not a valid image or PDF (or is too large)" } };
  if (missing.length) return { error: { code: "missing", keys: missing, message: "Please answer every required question" } };
  if (invalid.length) return { error: { code: "invalid", keys: invalid, message: "Some answers are not valid" } };

  // 3. what each exhibition receives, checked by its own rules
  const val = (key: string): Value => values.get(key) ?? {};
  const payloads = new Map<string, { kind: "default"; input: ExpoRegistrationInput } | { kind: "custom"; answers: Record<string, unknown>; schema: CustomFormSchema }>();
  for (const a of built.active) {
    if (!a.schema) {
      const orderList = ctx.profile.hasDocument["invoiceOrderList"] ? ((await getBuyerDocument(ctx.user.id, "invoiceOrderList")) ?? "") : "";
      const input: ExpoRegistrationInput = {
        exhibitionId: a.id,
        registrationType: "buyer",
        gender: (val("core:gender").text === "female" ? "female" : "male"),
        fullName: profileText(ctx, "fullName"),
        nationality: val("core:nationality").text ?? "",
        passportNumber: val("core:passportNumber").text ?? "",
        companyName: val("core:companyName").text ?? "",
        companyWebsite: typeof ctx.saved.get("core:companyWebsite")?.value === "string" ? ctx.saved.get("core:companyWebsite")!.value : "",
        phone: val("core:phone").text ?? "",
        email: val("core:email").text ?? "",
        companyType: val("core:companyType").text ?? "",
        companyTypeOther: val("core:companyTypeOther").text ?? "",
        companyScale: val("core:companyScale").text ?? "",
        companyIntro: ctx.saved.get("core:companyIntro")?.value ?? "",
        purposeOfVisit: val("core:purposeOfVisit").text ?? "",
        infoSource: val("core:infoSource").text ?? "",
        infoSourceOther: val("core:infoSourceOther").text ?? "",
        exportingMarkets: val("core:exportingMarkets").list ?? [],
        exportingMarketOther: val("core:exportingMarketOther").text ?? "",
        docPassportFront: val("core:docPassportFront").file ?? "",
        docBusinessCard: val("core:docBusinessCard").file ?? "",
        docVisaPage: val("core:docVisaPage").file ?? "",
        docBusinessLicense: val("core:docBusinessLicense").file ?? "",
        docOrderList: orderList,
      };
      const problem = validateExpoRegistration(input);
      if (problem) return { error: { code: "form", message: problem, slug: a.slug } };
      payloads.set(a.slug, { kind: "default", input });
    } else {
      const out: Record<string, unknown> = {};
      for (const q of built.questions) {
        const field = q.fields[a.slug];
        if (!field) continue;
        const v = val(q.key);
        if (q.kind === "file") { if (v.file) out[field.id] = v.file; }
        else if (q.kind === "checkbox") { if (v.list?.length) out[field.id] = v.list; }
        else if (v.text) out[field.id] = v.text;
      }
      const problem = validateCustomAnswers(a.schema, out);
      if (problem) return { error: { code: "form", message: problem, slug: a.slug } };
      payloads.set(a.slug, { kind: "custom", answers: out, schema: a.schema });
    }
  }

  // 4. keep what the buyer gave: on the profile, or among the saved answers
  const profileUpdates: Partial<BuyerProfileFields> = {};
  const extras: { key: string; label: string; kind: string; value: string }[] = [];
  for (const q of built.questions) {
    if (!q.visible || !provided.get(q.key)) continue;
    const v = val(q.key);
    if (!hasValue(v)) continue;
    if (q.docKey && v.file && !ctx.profile.hasDocument[q.docKey]) {
      try {
        await setBuyerDocument(ctx.user.id, q.docKey, v.file);
      } catch {
        return { error: { code: "invalid_file", keys: [q.key], message: "One of the files could not be read" } };
      }
      continue;
    }
    // A field of the profile that is empty takes the answer; one that has some other text keeps it, and the answer is remembered instead.
    if (q.profileField && typeof v.text === "string" && v.text && !String(ctx.profile[q.profileField] ?? "").trim()) {
      (profileUpdates as Record<string, string>)[q.profileField] = v.text;
      continue;
    }
    const kind = q.kind === "file" ? "file" : q.kind === "checkbox" ? "list" : "text";
    let value = q.kind === "file" ? v.file ?? "" : q.kind === "checkbox" ? JSON.stringify(v.list ?? []) : v.text ?? "";
    if (q.kind === "file") {
      try {
        value = await shrinkDocumentDataUrl(value);
      } catch {
        return { error: { code: "invalid_file", keys: [q.key], message: "One of the files could not be read" } };
      }
    }
    extras.push({ key: q.key, label: q.label ?? "", kind, value });
  }
  if (Object.keys(profileUpdates).length) await upsertBuyerProfileFields(ctx.user.id, profileUpdates);
  try {
    await saveExtraInfo(ctx.user.id, extras);
  } catch (err) {
    // The table is created by a migration; until it has run the registration still goes through.
    if ((err as { code?: string }).code !== "ER_NO_SUCH_TABLE") throw err;
  }

  // 5. the registrations
  let created = 0;
  for (const a of built.active) {
    const payload = payloads.get(a.slug)!;
    try {
      if (a.state === "resubmit" && a.existingId) {
        const ok = await rewriteRegistration(a.existingId, ctx.user.id, "resubmit", payload);
        results.push({ slug: a.slug, title: a.title, outcome: ok ? "registered_again" : "already_registered" });
        if (ok) created++;
      } else if (payload.kind === "custom") {
        await createCustomExpoRegistration(ctx.user.id, a.id, payload.answers, payload.schema);
        results.push({ slug: a.slug, title: a.title, outcome: "registered" });
        created++;
      } else {
        await createExpoRegistration(ctx.user.id, payload.input);
        results.push({ slug: a.slug, title: a.title, outcome: "registered" });
        created++;
      }
    } catch (err) {
      if (isDuplicateEntryError(err)) results.push({ slug: a.slug, title: a.title, outcome: "already_registered" });
      else {
        console.error("Bulk registration failed for", a.slug, err);
        results.push({ slug: a.slug, title: a.title, outcome: "failed", error: "Could not register" });
      }
    }
  }
  if (created > 0) upgradeReferralStatus(ctx.user.id, "booked_booth").catch((err) => console.error("Referral status upgrade error:", err));
  // In the order the buyer chose them.
  results.sort((x, y) => slugs.indexOf(x.slug) - slugs.indexOf(y.slug));
  return { results };
}

export { MAX_EXHIBITIONS_AT_ONCE };
