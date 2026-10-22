// What a buyer is asked for: the documents they upload and the extra information fields an admin
// added (Admin -> Buyer form settings). Shared by the server and the screens, so no server imports.

export type FormItemKind = "document" | "field";
export type FieldType = "text" | "longtext" | "date" | "choice";
export const FIELD_TYPES: FieldType[] = ["text", "longtext", "date", "choice"];

export interface FormLabels {
  en: string;
  ru: string;
  zh: string;
}

export interface FormItem {
  /** "passportFront" for the built-in documents, "c_ab12cd34" for ones an admin added. */
  key: string;
  kind: FormItemKind;
  builtin: boolean;
  labels: FormLabels;
  position: number;
  /** Hidden items are not shown or exported; what buyers already gave is kept. */
  active: boolean;
  /** Documents: must be uploaded and verified for the buyer to count as Verified. */
  required: boolean;
  /** Extra fields only. */
  fieldType: FieldType | null;
  /** Choices, in the same order in every language (empty unless fieldType is "choice"). */
  options: { en: string[]; ru: string[]; zh: string[] };
}

export const MAX_LABEL_LENGTH = 120;
export const MAX_OPTIONS = 30;
export const MAX_OPTION_LENGTH = 80;
export const MAX_CUSTOM_DOCUMENTS = 30;
export const MAX_CUSTOM_FIELDS = 40;
export const MAX_TEXT_VALUE = 300;
export const MAX_LONGTEXT_VALUE = 2000;

/** The name to show in a language; falls back to English when that language was left empty. */
export function itemLabel(item: Pick<FormItem, "labels">, locale: string | undefined): string {
  const lang = locale === "ru" || locale === "zh" ? locale : "en";
  return item.labels[lang].trim() || item.labels.en;
}

/** A choice in the buyer's language: what was saved is the English wording, shown in the reader's language. */
export function choiceLabel(item: Pick<FormItem, "options">, value: string, locale: string | undefined): string {
  const lang = locale === "ru" || locale === "zh" ? locale : "en";
  const index = item.options.en.indexOf(value);
  if (index < 0) return value;
  return item.options[lang][index]?.trim() || value;
}

// The built-in documents, in their default order. Used when the settings table does not exist
// yet (the site can go live a few minutes before the deploy job has applied the migration).
export const BUILTIN_DOCUMENT_DEFAULTS: { key: string; labels: FormLabels }[] = [
  { key: "passportFront", labels: { en: "Passport Front Page", ru: "Разворот паспорта", zh: "护照首页" } },
  { key: "visaPage", labels: { en: "Visa Page", ru: "Страница визы", zh: "签证页" } },
  { key: "businessLicense", labels: { en: "Business License", ru: "Лицензия компании", zh: "营业执照" } },
  { key: "businessCard", labels: { en: "Business Card", ru: "Визитная карточка", zh: "名片" } },
  { key: "buyerPhoto", labels: { en: "Buyer Photo", ru: "Фото покупателя", zh: "买家照片" } },
  { key: "cantonFairCard", labels: { en: "Canton Fair Card", ru: "Карта Кантонской ярмарки", zh: "广交会证件" } },
  { key: "invoiceOrderList", labels: { en: "Invoice / Order List", ru: "Счёт / список заказа", zh: "发票 / 订单清单" } },
  { key: "latestEntryStamp", labels: { en: "Latest Entry Stamp Photo", ru: "Фото последнего штампа въезда", zh: "最近入境章照片" } },
];

export function defaultFormItems(): FormItem[] {
  return BUILTIN_DOCUMENT_DEFAULTS.map((d, i) => ({
    key: d.key,
    kind: "document" as const,
    builtin: true,
    labels: d.labels,
    position: (i + 1) * 10,
    active: true,
    required: true,
    fieldType: null,
    options: { en: [], ru: [], zh: [] },
  }));
}

/** Overall verification for a set of documents: every required (shown) document uploaded and verified. */
export type DocState = { uploaded: boolean; status: "pending" | "verified" | "rejected" };

export function overallStatus(
  documents: Record<string, DocState | undefined>,
  items: Pick<FormItem, "key" | "kind" | "active" | "required">[]
): "not_started" | "pending_review" | "action_needed" | "verified" {
  const shown = items.filter((i) => i.kind === "document" && i.active);
  const uploaded = shown.filter((i) => documents[i.key]?.uploaded);
  if (uploaded.length === 0) return "not_started";
  if (uploaded.some((i) => documents[i.key]?.status === "rejected")) return "action_needed";
  const requiredDone = shown.filter((i) => i.required).every((i) => documents[i.key]?.uploaded);
  if (requiredDone && uploaded.every((i) => documents[i.key]?.status === "verified")) return "verified";
  return "pending_review";
}

/** True when every required shown document is uploaded. */
export function documentsComplete(documents: Record<string, DocState | undefined>, items: Pick<FormItem, "key" | "kind" | "active" | "required">[]): boolean {
  return items.filter((i) => i.kind === "document" && i.active && i.required).every((i) => documents[i.key]?.uploaded);
}
