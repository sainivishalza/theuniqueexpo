"use client";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import { isPlaceholderEmail } from "@/lib/login-id";
import { extractBuyerNumbers, formatBuyerNumber, parseBuyerNumber } from "@/lib/buyer-number";
import { NATIONALITIES } from "@/lib/expo-registrations";
import { DEPARTURE_CITIES, JOB_TITLES, VISA_TYPES } from "@/lib/buyer-profile-options";
import { formatNumber } from "@/lib/format";
import BulkPointsDialog from "./BulkPointsDialog";
import BulkReviewDialog from "./BulkReviewDialog";
import AnnounceDialog from "./AnnounceDialog";
import SavedViews from "../SavedViews";
import RecordNotes from "../RecordNotes";
import DocumentShare from "./DocumentShare";
import { TEXT_COLUMN_ORDER } from "@/lib/buyer-profile-columns";
import { useBuyerForm } from "@/lib/client/buyer-form";
import { documentsComplete, type FormItem } from "@/lib/buyer-form";
import Button from "@/components/ui/Button";
import UrlSearchSync from "@/components/UrlSearchSync";
import DocumentLightbox from "../../dashboard/_components/DocumentLightbox";
import DocumentThumb from "../../dashboard/_components/DocumentThumb";

type VerificationStatus = "not_started" | "pending_review" | "action_needed" | "verified";
type DocReviewStatus = "pending" | "verified" | "rejected";

interface AdminBuyerProfileRow {
  userId: number;
  // Registration number as shown (TUE0001) and as a plain number.
  buyerNumber: string;
  buyerNo: number | null;
  rewardPoints: number;
  expoIds: number[];
  name: string;
  email: string;
  status: "active" | "suspended";
  companyName: string;
  nationality: string;
  passportNumber: string;
  passportName: string;
  gender: string;
  wechatId: string;
  departureCity: string;
  attendanceDay: string;
  meetingOrVisiting: string;
  jobTitle: string;
  companyField: string;
  overseasCompanyAddress: string;
  contactEmail: string;
  phoneNumber: string;
  registrationCode: string;
  sourceExhibitions: string;
  annualTurnover: string;
  contactPerson: string;
  dateOfBirth: string;
  visaType: string;
  visaExpireDate: string;
  passportExpireDate: string;
  purchaseIntention: string;
  otherPurchaseIntention: string;
  documentsUploaded: number;
  verificationStatus: VerificationStatus;
  documents: Record<string, { uploaded: boolean; status: DocReviewStatus }>;
  // Answers to the extra information fields an admin added, by field key.
  custom: Record<string, string>;
}

// Every string field above is searchable from the one search box -- see
// `filtered` below.
type StringRowKey = { [K in keyof AdminBuyerProfileRow]: AdminBuyerProfileRow[K] extends string ? K : never }[keyof AdminBuyerProfileRow];
const SEARCHABLE_ROW_FIELDS: StringRowKey[] = [
  "buyerNumber", "name", "email", "companyName", "nationality", "passportNumber", "passportName",
  "gender", "wechatId", "departureCity", "attendanceDay", "meetingOrVisiting",
  "jobTitle", "companyField", "overseasCompanyAddress", "contactEmail", "phoneNumber",
  "registrationCode", "sourceExhibitions", "annualTurnover", "contactPerson", "dateOfBirth", "visaType",
  "visaExpireDate", "passportExpireDate", "purchaseIntention", "otherPurchaseIntention",
];

interface DocReview {
  status: DocReviewStatus;
  note: string;
}

interface BuyerProfileDetail {
  expoIds: number[];
  companyName: string;
  nationality: string;
  passportNumber: string;
  annualTurnover: string;
  purchaseIntention: string;
  otherPurchaseIntention: string;
  contactPerson: string;
  registrationCode: string;
  sourceExhibitions: string;
  departureCity: string;
  attendanceDay: string;
  meetingOrVisiting: string;
  passportName: string;
  gender: string;
  wechatId: string;
  overseasCompanyAddress: string;
  companyField: string;
  jobTitle: string;
  contactEmail: string;
  phoneNumber: string;
  dateOfBirth: string;
  visaType: string;
  visaExpireDate: string;
  passportExpireDate: string;
  hasDocument: Record<string, boolean>;
  documentReview: Record<string, DocReview>;
  custom: Record<string, string>;
}

const STATUS_BADGE_STYLES: Record<VerificationStatus, string> = {
  not_started: "bg-gray-100 text-gray-600",
  pending_review: "bg-amber-50 text-amber-700",
  action_needed: "bg-red-50 text-red-700",
  verified: "bg-green-50 text-green-700",
};

const DOC_STATUS_STYLES: Record<DocReviewStatus, string> = {
  pending: "border-gray-200",
  verified: "border-green-400",
  rejected: "border-red-400",
};

const DOC_BADGE_STYLES: Record<DocReviewStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  verified: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
};

type DetailFieldKey = Exclude<keyof BuyerProfileDetail, "hasDocument" | "documentReview" | "expoIds" | "custom">;

interface FieldDef {
  key: DetailFieldKey;
  kind: "text" | "email" | "date" | "combo" | "select" | "expos";
  options?: readonly string[];
  // "select" only: false when `options` are already human-readable and
  // shouldn't be looked up in fieldOptions.<key>.<opt> (visaType's list is
  // shown as-is; meetingOrVisiting/gender still need translation).
  translateOptions?: boolean;
}

// "combo" fields render as a text input with a <datalist> of suggestions --
// pick from the list, or type a value that isn't in it. "select" fields are
// a closed set of internal values with translated labels.
const FIELDS: FieldDef[] = [
  { key: "companyName", kind: "text" },
  { key: "nationality", kind: "combo", options: NATIONALITIES },
  { key: "passportNumber", kind: "text" },
  { key: "annualTurnover", kind: "text" },
  { key: "contactPerson", kind: "text" },
  { key: "registrationCode", kind: "text" },
  { key: "sourceExhibitions", kind: "expos" },
  { key: "departureCity", kind: "combo", options: DEPARTURE_CITIES },
  { key: "attendanceDay", kind: "text" },
  { key: "passportName", kind: "text" },
  { key: "wechatId", kind: "text" },
  { key: "overseasCompanyAddress", kind: "text" },
  { key: "companyField", kind: "text" },
  { key: "jobTitle", kind: "combo", options: JOB_TITLES },
  { key: "contactEmail", kind: "email" },
  { key: "phoneNumber", kind: "text" },
  { key: "dateOfBirth", kind: "date" },
  { key: "visaType", kind: "select", options: VISA_TYPES, translateOptions: false },
  { key: "visaExpireDate", kind: "date" },
  { key: "passportExpireDate", kind: "date" },
  { key: "meetingOrVisiting", kind: "select", options: ["meeting", "visiting"] },
  { key: "gender", kind: "select", options: ["male", "female", "other"] },
];
// The columns of the list: the order is shared with the Excel download (src/lib/buyer-profile-columns.ts).
// (The edit form keeps the order of FIELDS above.)
const TABLE_FIELDS: FieldDef[] = TEXT_COLUMN_ORDER.flatMap((key) => FIELDS.filter((f) => f.key === key));
// The documents and extra fields come from Admin -> Buyer form settings (see useBuyerForm below).
const EXPORT_UNTICKED_STORAGE_KEY = "buyer-profiles-export-unticked";

// The "Filter by documents" choices: which buyers still owe a document, or are waiting on review.
function matchesDocFilter(row: AdminBuyerProfileRow, filter: string, docs: FormItem[]): boolean {
  const uploaded = docs.filter((d) => row.documents[d.key]?.uploaded).length;
  if (filter === "missing_any") return uploaded < docs.length;
  if (filter === "complete") return documentsComplete(row.documents, docs);
  if (filter === "waiting_review") return docs.some((d) => row.documents[d.key]?.uploaded && row.documents[d.key]?.status === "pending");
  if (filter === "pending_review" || filter === "action_needed") return row.verificationStatus === filter;
  if (filter.startsWith("missing:")) return !row.documents[filter.slice(8)]?.uploaded;
  return true;
}

// The list draws this many buyers at a time (then "Show more"): with a couple of
// thousand buyers a single table of every row made typing in the search box lag.
const PAGE_SIZE = 100;

// A document's small picture in the table; a PDF (no picture) shows a "PDF file" tile.
function ListThumb({ src, alt, pdfLabel }: { src: string; alt: string; pdfLabel: string }) {
  const [failed, setFailed] = useState(false);
  const box = "mb-1 h-12 w-16 rounded-lg border border-gray-200 transition-colors hover:border-emerald-400";
  if (failed) {
    return (
      <span className={`${box} flex flex-col items-center justify-center bg-cream-50 text-emerald-900`}>
        <span aria-hidden="true" className="text-base leading-none">📄</span>
        <span className="text-[10px] font-bold">{pdfLabel}</span>
      </span>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`${box} object-cover`} />;
}

interface ExpoOption {
  id: number;
  name: string;
}

// A dropdown with a tick-box per expo, so a buyer can be tagged with several.
// The list comes from Admin -> Buyer Expos.
function ExpoMultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
  emptyText,
  selectedText,
}: {
  // Lets the field's <label htmlFor> point at the dropdown button.
  id?: string;
  options: ExpoOption[];
  value: number[];
  onChange: (ids: number[]) => void;
  placeholder: string;
  emptyText: string;
  selectedText: (count: number) => string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const names = options.filter((o) => value.includes(o.id)).map((o) => o.name);
  // An expo id no longer in the list (deleted elsewhere) is simply not shown.
  const label = names.length === 0 ? placeholder : names.length <= 2 ? names.join(", ") : selectedText(names.length);

  function toggle(id: number) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm focus:border-emerald-500 outline-none"
      >
        <span className={`truncate ${names.length === 0 ? "text-gray-500" : "text-gray-900"}`}>{label}</span>
        <svg className="h-4 w-4 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div role="listbox" aria-multiselectable="true" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-500">{emptyText}</p>
          ) : (
            options.map((o) => (
              <label key={o.id} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-cream-50">
                <input type="checkbox" checked={value.includes(o.id)} onChange={() => toggle(o.id)} className="h-4 w-4 rounded border-gray-300" />
                <span className="break-words">{o.name}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminBuyerProfilesPage() {
  const t = useTranslations("adminBuyerProfiles");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<AdminBuyerProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expoFilter, setExpoFilter] = useState("");
  const [docFilter, setDocFilter] = useState("");
  // "?docs=waiting_review" (from "Needs your attention" on the admin home) opens with that filter on.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("docs");
    if (wanted === "waiting_review" || wanted === "pending_review" || wanted === "action_needed") setDocFilter(wanted);
  }, []);
  const [pointsFilter, setPointsFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  // Who looks after which buyer, and the tags, for filtering (loaded once; changes made in a buyer's panel show on the next visit).
  const [meta, setMeta] = useState<{ tags: Record<string, string[]>; assignees: Record<string, number>; allTags: string[]; admins: { id: number; name: string }[]; me: number } | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [groupAnnounceOpen, setGroupAnnounceOpen] = useState(false);
  const [expoOptions, setExpoOptions] = useState<ExpoOption[]>([]);
  const [error, setError] = useState("");

  const [openId, setOpenId] = useState<number | null>(null);
  // Addresses that bounced for good: those buyers are marked in the list (an e-mail to them cannot arrive).
  const [bouncedEmails, setBouncedEmails] = useState<Set<string>>(new Set());
  useEffect(() => {
    fetch("/api/admin/email-bounces?summary=1")
      .then((r) => (r.ok ? r.json() : { hard: [] }))
      .then((d) => setBouncedEmails(new Set((d.hard ?? []).map((e: string) => e.toLowerCase()))))
      .catch(() => {});
  }, []);
  const [detail, setDetail] = useState<BuyerProfileDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // The profile object as last saved: "Saved." shows while the form still equals it, and goes away on the next edit.
  const [savedDetail, setSavedDetail] = useState<BuyerProfileDetail | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [docVersion, setDocVersion] = useState(0);
  const [reviewingField, setReviewingField] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ userId: number; field: string; buyerName: string } | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // The documents and extra fields currently asked for (Admin -> Buyer form settings), in order.
  const form = useBuyerForm(true);
  const docItems = form.documents;
  const docLabel = (key: string) => {
    const item = docItems.find((d) => d.key === key);
    return item ? form.label(item) : key;
  };
  // Export columns: the built-in ones in screen order, the extra fields, then the documents. Everything
  // is ticked unless the admin unticked it; what was unticked is remembered in this browser.
  const exportOrder = useMemo(() => [...TEXT_COLUMN_ORDER, ...form.fields.map((f) => f.key), ...form.documents.map((d) => d.key)], [form.fields, form.documents]);
  const [unticked, setUnticked] = useState<Set<string>>(new Set());
  const exportFields = useMemo(() => new Set(exportOrder.filter((k) => !unticked.has(k))), [exportOrder, unticked]);
  const toggleExport = (key: string) =>
    setUnticked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const [exportPickerOpen, setExportPickerOpen] = useState(false);
  // The ticked export columns are remembered in this browser, so they are not ticked again each time.
  const [exportFieldsLoaded, setExportFieldsLoaded] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(EXPORT_UNTICKED_STORAGE_KEY) ?? "null");
      if (Array.isArray(saved)) setUnticked(new Set(saved.filter((key): key is string => typeof key === "string")));
    } catch {
      // storage blocked or unreadable: keep the default (everything ticked)
    }
    setExportFieldsLoaded(true);
  }, []);
  useEffect(() => {
    if (!exportFieldsLoaded) return;
    try {
      localStorage.setItem(EXPORT_UNTICKED_STORAGE_KEY, JSON.stringify(Array.from(unticked)));
    } catch {
      // ignore: remembering is a convenience only
    }
  }, [unticked, exportFieldsLoaded]);
  const [exporting, setExporting] = useState<"excel" | "zip" | null>(null);
  // "Select by registration numbers": paste a list or a range, tick exactly those buyers.
  const [numbersOpen, setNumbersOpen] = useState(false);
  const [numbersText, setNumbersText] = useState("");
  const [numbersResult, setNumbersResult] = useState<{ found: number; missing: string[] } | null>(null);

  useEffect(() => {
    fetch("/api/admin/record-meta/overview?type=buyer", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMeta(d))
      .catch(() => {});
  }, []);

  // The search box stays responsive while the (deferred) list catches up.
  const deferredSearch = useDeferredValue(search);
  // Every searchable field of every buyer, lower-cased once per load instead of on every keystroke.
  const searchable = useMemo(() => rows.map((r) => [...SEARCHABLE_ROW_FIELDS.map((field) => r[field].toLowerCase()), ...Object.values(r.custom ?? {}).map((v) => v.toLowerCase())]), [rows]);
  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const expoId = expoFilter ? Number(expoFilter) : null;
    // "TUE12", "tue0012" and "12" all find buyer number 12 (plain text search below
    // would only match the padded TUE0012).
    const asNumber = q && /^(tue)?\s*\d+$/i.test(q) ? parseBuyerNumber(q) : null;
    const matches = rows.filter((r, i) => {
      if (expoId !== null && !r.expoIds.includes(expoId)) return false;
      if (docFilter && !matchesDocFilter(r, docFilter, docItems)) return false;
      if (pointsFilter === "has" && r.rewardPoints <= 0) return false;
      if (pointsFilter === "none" && r.rewardPoints > 0) return false;
      if (assigneeFilter) {
        const who = meta?.assignees[String(r.userId)];
        if (assigneeFilter === "none" ? who !== undefined : who !== (assigneeFilter === "me" ? meta?.me : Number(assigneeFilter))) return false;
      }
      if (tagFilter && !(meta?.tags[String(r.userId)] ?? []).some((x) => x.toLowerCase() === tagFilter.toLowerCase())) return false;
      if (!q) return true;
      if (asNumber !== null && r.buyerNo === asNumber) return true;
      return searchable[i].some((value) => value.includes(q));
    });
    // "Most points first" (a stable sort: buyers with the same points keep their order).
    if (pointsFilter === "top") matches.sort((x, y) => y.rewardPoints - x.rewardPoints);
    // Searching "TUE12" also matches TUE1200-TUE1299: keep the exact number on the first page.
    const exact = asNumber === null ? -1 : matches.findIndex((r) => r.buyerNo === asNumber);
    if (exact > 0) matches.unshift(...matches.splice(exact, 1));
    return matches;
  }, [rows, searchable, expoFilter, docFilter, pointsFilter, assigneeFilter, tagFilter, meta, deferredSearch, docItems]);
  // How many pages of the list are showing. Changing the search or the expo filter
  // starts again from the first page (state adjusted while rendering, the pattern React
  // documents for "reset state when an input changes").
  const filterKey = `${expoFilter}\n${docFilter}\n${pointsFilter}\n${assigneeFilter}\n${tagFilter}\n${deferredSearch}`;
  const [pageState, setPageState] = useState({ key: filterKey, pages: 1 });
  if (pageState.key !== filterKey) setPageState({ key: filterKey, pages: 1 });
  const visible = filtered.slice(0, pageState.pages * PAGE_SIZE);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    loadRows();
    loadExpoOptions();
  }, [user]);

  async function loadExpoOptions() {
    try {
      const res = await fetch("/api/admin/buyer-expos");
      const data = await res.json();
      if (res.ok) setExpoOptions(data.expos);
    } catch {
      // The dropdown just stays empty; the rest of the page still works.
    }
  }

  async function loadRows() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/buyer-profiles");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("loadFailed"));
      setRows(data.profiles);
    } catch (err) {
      setError(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(userId: number) {
    setOpenId(userId);
    setDetail(null);
    setSavedDetail(null);
    setError("");
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/buyer-profiles/${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDetail(data.profile);
    } catch (err) {
      setError(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleSave() {
    if (openId === null || !detail) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/buyer-profiles/${openId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(detail),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("saveFailed"));
      setDetail(data.profile);
      setSavedDetail(data.profile);
      await loadRows();
      await loadExpoOptions();
    } catch (err) {
      setError(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setSaving(false);
    }
  }

  async function handleDocUpload(field: string, file: File | null) {
    if (openId === null || !file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError(t("fileTooLarge"));
      return;
    }
    setUploadingField(field);
    setError("");
    try {
      const { readDocumentAsDataUrl } = await import("@/lib/client/image-upload");
      const dataUrl = await readDocumentAsDataUrl(file);
      const res = await fetch(`/api/admin/buyer-profiles/${openId}/documents/${field}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("uploadFailed"));
      setDetail((p) => (p ? { ...p, hasDocument: { ...p.hasDocument, [field]: true } } : p));
      setDocVersion((v) => v + 1);
      await loadRows();
    } catch (err) {
      setError(errorMessage(err, t("uploadFailed")));
    } finally {
      setUploadingField(null);
    }
  }

  async function handleReviewChange(field: string, status: DocReviewStatus, note: string) {
    if (openId === null) return;
    setReviewingField(field);
    setError("");
    try {
      const res = await fetch(`/api/admin/buyer-profiles/${openId}/documents/${field}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("reviewFailed"));
      setDetail((p) => (p ? { ...p, documentReview: { ...p.documentReview, [field]: { status, note } } } : p));
      await loadRows();
    } catch (err) {
      setError(errorMessage(err, t("reviewFailed")));
    } finally {
      setReviewingField(null);
    }
  }

  function toggleSelected(userId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  // "Select all" only ever acts on the rows the current search is
  // showing -- selecting narrows the search first, "select all" ticks
  // just that narrowed list, and it doesn't touch anything selected
  // outside of it. If every currently-visible row is already selected,
  // it deselects just those; otherwise it adds all of them.
  function toggleSelectAllFiltered() {
    const filteredIds = filtered.map((r) => r.userId);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filteredIds.forEach((id) => next.delete(id));
      else filteredIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function downloadExport(url: string, body: unknown, filename: string, kind: "excel" | "zip") {
    setExporting(kind);
    setError("");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("exportFailed"));
      }
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      setError(errorMessage(err, t("exportFailed")));
    } finally {
      setExporting(null);
    }
  }

  // Ticks exactly the buyers whose registration numbers were pasted (TUE0001, a
  // list, or a range like TUE0010-TUE0025) and says which numbers matched nobody.
  function selectByNumbers() {
    const wanted = extractBuyerNumbers(numbersText);
    const byNumber = new Map<number, number>();
    for (const r of rows) if (r.buyerNo !== null) byNumber.set(r.buyerNo, r.userId);
    const ids = new Set<number>();
    const missing: string[] = [];
    for (const n of wanted) {
      const id = byNumber.get(n);
      if (id !== undefined) ids.add(id);
      else missing.push(formatBuyerNumber(n));
    }
    setSelected(ids);
    setNumbersResult({ found: ids.size, missing });
  }

  function runExportExcel() {
    const date = new Date().toISOString().slice(0, 10);
    // Registration number, name and account email always ride along regardless of
    // what's ticked -- an export with none of the identifying fields checked
    // wouldn't even say whose row is whose.
    // The other columns follow the same order as the table on screen.
    const fields = ["buyerNumber", "name", "email", ...exportOrder.filter((key) => exportFields.has(key))];
    downloadExport(
      "/api/admin/buyer-profiles/export/excel",
      { userIds: Array.from(selected), fields },
      `buyer-profiles-${date}.xlsx`,
      "excel"
    );
    setExportPickerOpen(false);
  }

  function runExportZip() {
    const date = new Date().toISOString().slice(0, 10);
    downloadExport(
      "/api/admin/buyer-profiles/export/documents-zip",
      { userIds: Array.from(selected) },
      `buyer-documents-${date}.zip`,
      "zip"
    );
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{t("accessDenied")}</p></div>;
  }

  // Renders a FIELDS-driven column's value the same way the Edit panel
  // would show it (translated option label for a "select" field that needs
  // translation, raw text otherwise) so the list table and the edit form
  // never disagree about what a value means.
  function fieldDisplayValue(r: AdminBuyerProfileRow, field: FieldDef): string {
    const value = r[field.key as keyof AdminBuyerProfileRow];
    if (typeof value !== "string" || !value) return "—";
    if (field.kind === "select" && field.translateOptions !== false) {
      return t(`fieldOptions.${field.key}.${value}`);
    }
    return value;
  }

  return (
    <div>
      <section className="bg-[var(--color-hero-bg)] py-8">
        <div className="mx-auto max-w-6xl px-6">
          <Link href="/admin" className="py-1 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            {t("backToAdmin")}
          </Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-gray-400 text-sm">{t("subtitle", { count: rows.length })}</p>
        </div>
      </section>

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-6xl px-6 space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

          {/* The admin menu's search sends "?q=..." here to open the list already filtered. */}
          <UrlSearchSync onChange={setSearch} />
          <SavedViews
            page="buyer-profiles"
            filters={{ search, expo: expoFilter, docs: docFilter, points: pointsFilter }}
            onApply={(f) => {
              setSearch(f.search ?? "");
              setExpoFilter(f.expo ?? "");
              setDocFilter(f.docs ?? "");
              setPointsFilter(f.points ?? "");
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              aria-label={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full max-w-md rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <select
              value={expoFilter}
              onChange={(e) => setExpoFilter(e.target.value)}
              aria-label={t("filterByExpo")}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">{t("allExpos")}</option>
              {expoOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <select
              value={docFilter}
              onChange={(e) => setDocFilter(e.target.value)}
              aria-label={t("filterByDocuments")}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">{t("docFilter.all")}</option>
              <option value="missing_any">{t("docFilter.missingAny")}</option>
              <option value="complete">{t("docFilter.complete")}</option>
              <option value="waiting_review">{t("docFilter.waitingReview")}</option>
              <option value="pending_review">{t("docFilter.pendingReview")}</option>
              <option value="action_needed">{t("docFilter.actionNeeded")}</option>
              {docItems.map((d) => (
                <option key={d.key} value={`missing:${d.key}`}>{t("docFilter.missingOne", { name: form.label(d) })}</option>
              ))}
            </select>
            <select
              value={pointsFilter}
              onChange={(e) => setPointsFilter(e.target.value)}
              aria-label={t("filterByPoints")}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">{t("pointsFilter.all")}</option>
              <option value="has">{t("pointsFilter.has")}</option>
              <option value="none">{t("pointsFilter.none")}</option>
              <option value="top">{t("pointsFilter.top")}</option>
            </select>
            <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} aria-label={t("assigneeFilter.label")} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">{t("assigneeFilter.all")}</option>
              <option value="me">{t("assigneeFilter.me")}</option>
              <option value="none">{t("assigneeFilter.none")}</option>
              {(meta?.admins ?? []).filter((a) => a.id !== meta?.me).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {(meta?.allTags.length ?? 0) > 0 && (
              <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} aria-label={t("tagFilter.label")} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">{t("tagFilter.all")}</option>
                {meta!.allTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            )}
            <Link href="/admin/buyer-expos" className="py-1 text-sm font-semibold text-emerald-800 hover:text-emerald-900 underline">{t("manageExpos")}</Link>
            <Button onClick={() => setGroupAnnounceOpen(true)} variant="secondaryOutline" size="xs">{t("announce.groupToggle")}</Button>
            {selected.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2">
                <span className="text-sm font-semibold text-emerald-800">{t("selectedCount", { count: selected.size })}</span>
                <Button onClick={() => setExportPickerOpen(true)} variant="secondaryOutline" size="xs">{t("exportExcel")}</Button>
                <Button onClick={runExportZip} disabled={exporting === "zip"} variant="secondaryOutline" size="xs">
                  {exporting === "zip" ? ta("loading") : t("exportZip")}
                </Button>
                <Button onClick={() => setBulkOpen(true)} variant="secondaryOutline" size="xs">{t("bulk.toggle")}</Button>
                <Button onClick={() => setReviewOpen(true)} variant="secondaryOutline" size="xs">{t("review.toggle")}</Button>
                <Button onClick={() => setAnnounceOpen(true)} variant="secondaryOutline" size="xs">{t("announce.toggle")}</Button>
                <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-emerald-700 hover:text-emerald-900 underline">
                  {t("clearSelection")}
                </button>
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setNumbersOpen((open) => !open)}
              aria-expanded={numbersOpen}
              className="py-1 text-sm font-semibold text-emerald-800 hover:text-emerald-900 underline"
            >
              {t("selectByNumbers.toggle")}
            </button>
            {numbersOpen && (
              <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 max-w-2xl">
                <label htmlFor="select-by-numbers" className="block text-sm text-gray-600 mb-2">{t("selectByNumbers.hint")}</label>
                <textarea
                  id="select-by-numbers"
                  value={numbersText}
                  onChange={(e) => setNumbersText(e.target.value)}
                  rows={3}
                  placeholder={t("selectByNumbers.placeholder")}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Button type="button" onClick={selectByNumbers} disabled={!numbersText.trim()} variant="secondaryOutline" size="xs">
                    {t("selectByNumbers.apply")}
                  </Button>
                  {numbersResult && (
                    <span className="text-sm text-gray-700" role="status">
                      {t("selectByNumbers.found", { count: numbersResult.found })}
                      {numbersResult.missing.length > 0 && (
                        <span className="text-red-700">
                          {" "}
                          {t("selectByNumbers.notFound", {
                            list: numbersResult.missing.slice(0, 20).join(", ") + (numbersResult.missing.length > 20 ? ` +${numbersResult.missing.length - 20}` : ""),
                          })}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <p className="text-gray-500 text-center py-10">{ta("loading")}</p>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm">
              {/* The list scrolls inside its own frame, so the column headings stay in view while going
                  down and the sideways scroll bar is always at the bottom of the screen, not 100 rows away. */}
              <div className="max-h-[calc(100vh-6rem)] overflow-auto rounded-2xl">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100">
                    <tr>
                      <th className="sticky left-0 top-0 z-30 bg-cream-50 text-left px-6 py-3 font-semibold text-gray-600 whitespace-nowrap shadow-[0_1px_0_0_#e5e7eb]">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={filtered.length > 0 && filtered.every((r) => selected.has(r.userId))}
                            onChange={toggleSelectAllFiltered}
                            className="h-4 w-4 rounded border-gray-300"
                            aria-label={t("selectAll")}
                          />
                          {ta("name")}
                        </div>
                      </th>
                      {TABLE_FIELDS.map((field) => (
                        <th key={field.key} className="sticky top-0 z-20 bg-cream-50 text-left px-6 py-3 font-semibold text-gray-600 whitespace-nowrap shadow-[0_1px_0_0_#e5e7eb]">{t(`fields.${field.key}`)}</th>
                      ))}
                      <th className="sticky top-0 z-20 bg-cream-50 text-left px-6 py-3 font-semibold text-gray-600 whitespace-nowrap shadow-[0_1px_0_0_#e5e7eb]">{t("fields.purchaseIntention")}</th>
                      <th className="sticky top-0 z-20 bg-cream-50 text-left px-6 py-3 font-semibold text-gray-600 whitespace-nowrap shadow-[0_1px_0_0_#e5e7eb]">{t("fields.otherPurchaseIntention")}</th>
                      {form.fields.map((item) => (
                        <th key={item.key} className="sticky top-0 z-20 bg-cream-50 text-left px-6 py-3 font-semibold text-gray-600 whitespace-nowrap shadow-[0_1px_0_0_#e5e7eb]">{form.label(item)}</th>
                      ))}
                      {docItems.map((item) => (
                        <th key={item.key} className="sticky top-0 z-20 bg-cream-50 text-left px-6 py-3 font-semibold text-gray-600 whitespace-nowrap shadow-[0_1px_0_0_#e5e7eb]">{form.label(item)}</th>
                      ))}
                      <th className="sticky top-0 z-20 bg-cream-50 text-left px-6 py-3 font-semibold text-gray-600 whitespace-nowrap shadow-[0_1px_0_0_#e5e7eb]">{t("verificationColumn")}</th>
                      <th className="sticky top-0 z-20 bg-cream-50 text-right px-6 py-3 font-semibold text-gray-600 whitespace-nowrap shadow-[0_1px_0_0_#e5e7eb]">{ta("actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visible.map((r) => (
                      <tr key={r.userId} className="hover:bg-cream-50">
                        <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selected.has(r.userId)}
                              onChange={() => toggleSelected(r.userId)}
                              className="h-4 w-4 rounded border-gray-300"
                              aria-label={r.name}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                {r.buyerNumber && <span className="text-xs font-bold tracking-wide text-emerald-700">{r.buyerNumber}</span>}
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{t("rewardPointsShort", { points: formatNumber(r.rewardPoints) })}</span>
                              </div>
                              <div className="font-semibold text-gray-900">{r.name}</div>
                              <div className="text-xs text-gray-500">{isPlaceholderEmail(r.email) ? t("noEmail") : r.email}</div>
                              {bouncedEmails.has(r.email.toLowerCase()) && <div className="mt-0.5"><span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-800" data-testid="email-bounced">{t("emailBounced")}</span></div>}
                            </div>
                          </div>
                        </td>
                        {TABLE_FIELDS.map((field) => (
                          <td key={field.key} className="px-6 py-4 text-gray-700 whitespace-nowrap">{fieldDisplayValue(r, field)}</td>
                        ))}
                        <td className="px-6 py-4 text-gray-700 max-w-[220px] truncate" title={r.purchaseIntention}>{r.purchaseIntention || "—"}</td>
                        <td className="px-6 py-4 text-gray-700 max-w-[220px] truncate" title={r.otherPurchaseIntention}>{r.otherPurchaseIntention || "—"}</td>
                        {form.fields.map((item) => {
                          const value = r.custom?.[item.key] ?? "";
                          return (
                            <td key={item.key} className="px-6 py-4 text-gray-700 max-w-[220px] truncate" title={value}>{value ? (item.fieldType === "choice" ? form.choice(item, value) : value) : "—"}</td>
                          );
                        })}
                        {docItems.map((item) => {
                          const field = item.key;
                          const doc = r.documents[field];
                          return (
                            <td key={field} className="px-6 py-4 whitespace-nowrap">
                              {doc?.uploaded ? (
                                <button
                                  type="button"
                                  onClick={() => setLightbox({ userId: r.userId, field, buyerName: r.name })}
                                  className="block"
                                >
                                  <ListThumb
                                    src={`/api/admin/buyer-profiles/${r.userId}/documents/${field}?thumb=1`}
                                    alt={form.label(item)}
                                    pdfLabel={ta("viewer.pdf")}
                                  />
                                  <span className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold ${DOC_BADGE_STYLES[doc.status]}`}>
                                    {t(`docReview.${doc.status}`)}
                                  </span>
                                </button>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_STYLES[r.verificationStatus]}`}>
                            {t(`verificationStatus.${r.verificationStatus}`)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <Button onClick={() => openDetail(r.userId)} variant="save" size="xs">{ta("edit")}</Button>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={FIELDS.length + form.fields.length + docItems.length + 5} className="px-6 py-10 text-center text-gray-500">{t("noResults")}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filtered.length > visible.length && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
                  <span role="status" className="text-sm text-gray-600">{t("showingOf", { shown: visible.length, total: filtered.length })}</span>
                  <Button
                    onClick={() => setPageState({ key: filterKey, pages: pageState.pages + 1 })}
                    variant="secondaryOutline"
                    size="xs"
                  >
                    {t("showMore", { count: Math.min(PAGE_SIZE, filtered.length - visible.length) })}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {openId !== null && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpenId(null)} />
          <div className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-heading">{t("editProfile")}</h2>
                {(() => {
                  const open = rows.find((r) => r.userId === openId);
                  return open ? <p className="text-sm text-gray-500"><span className="font-bold text-emerald-700">{open.buyerNumber}</span>{open.buyerNumber ? " · " : ""}{open.name}</p> : null;
                })()}
                {(() => {
                  const open = rows.find((r) => r.userId === openId);
                  return open ? (
                    <p className="mt-1 text-sm text-gray-700">
                      <span className="font-semibold">{t("rewardPointsShort", { points: formatNumber(open.rewardPoints) })}</span>
                      {" · "}
                      <Link href="/admin/wallet?tab=wallets" className="py-1 font-semibold text-emerald-800 underline hover:text-emerald-900">{t("openWallet")}</Link>
                    </p>
                  ) : null;
                })()}
              </div>
              <button onClick={() => setOpenId(null)} className="text-gray-500 hover:text-gray-600">✕</button>
            </div>

            {detailLoading || !detail ? (
              <p className="text-gray-500">{ta("loading")}</p>
            ) : (
              <div className="space-y-6">
                {openId !== null && <RecordNotes type="buyer" id={openId} />}
                <div className="grid grid-cols-2 gap-4">
                  {FIELDS.map((field) => (
                    <div key={field.key} className={field.kind === "expos" ? "col-span-2" : undefined}>
                      <label htmlFor={`ebp-${field.key}`} className="block text-xs font-semibold text-gray-500 mb-1">{t(`fields.${field.key}`)}</label>
                      {field.kind === "expos" ? (
                        <ExpoMultiSelect
                          id={`ebp-${field.key}`}
                          options={expoOptions}
                          value={detail.expoIds}
                          onChange={(ids) => setDetail({ ...detail, expoIds: ids })}
                          placeholder={t("expoPlaceholder")}
                          emptyText={t("noExpoOptions")}
                          selectedText={(count) => t("expoSelectedCount", { count })}
                        />
                      ) : field.kind === "select" ? (
                        <select
                          id={`ebp-${field.key}`}
                          value={detail[field.key]}
                          onChange={(e) => setDetail({ ...detail, [field.key]: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                        >
                          <option value="">{t("selectPlaceholder")}</option>
                          {/* A value saved before (e.g. imported "Work or Business Visa") that isn't in the list stays selectable instead of silently showing blank. */}
                          {detail[field.key] && !field.options!.includes(detail[field.key] as string) && (
                            <option value={detail[field.key] as string}>{detail[field.key] as string}</option>
                          )}
                          {field.options!.map((opt) => (
                            <option key={opt} value={opt}>{field.translateOptions === false ? opt : t(`fieldOptions.${field.key}.${opt}`)}</option>
                          ))}
                        </select>
                      ) : (
                        <>
                          <input
                            id={`ebp-${field.key}`}
                            type={field.kind === "email" || field.kind === "date" ? field.kind : "text"}
                            list={field.kind === "combo" ? `${field.key}-options` : undefined}
                            value={detail[field.key]}
                            onChange={(e) => setDetail({ ...detail, [field.key]: e.target.value })}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                          />
                          {field.kind === "combo" && (
                            <datalist id={`${field.key}-options`}>
                              {field.options!.map((opt) => <option key={opt} value={opt} />)}
                            </datalist>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div>
                  <label htmlFor="ebp-purchaseIntention" className="block text-xs font-semibold text-gray-500 mb-1">{t("fields.purchaseIntention")}</label>
                  <textarea
                    id="ebp-purchaseIntention"
                    value={detail.purchaseIntention}
                    onChange={(e) => setDetail({ ...detail, purchaseIntention: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="ebp-otherPurchaseIntention" className="block text-xs font-semibold text-gray-500 mb-1">{t("fields.otherPurchaseIntention")}</label>
                  <textarea
                    id="ebp-otherPurchaseIntention"
                    value={detail.otherPurchaseIntention}
                    onChange={(e) => setDetail({ ...detail, otherPurchaseIntention: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                {form.fields.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{t("extraInfo")}</p>
                    <div className="grid grid-cols-2 gap-4">
                      {form.fields.map((item) => {
                        const id = `ebp-custom-${item.key}`;
                        const value = detail.custom?.[item.key] ?? "";
                        const set = (v: string) => setDetail({ ...detail, custom: { ...detail.custom, [item.key]: v } });
                        const common = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 outline-none";
                        return (
                          <div key={item.key} className={item.fieldType === "longtext" ? "col-span-2" : undefined}>
                            <label htmlFor={id} className="block text-xs font-semibold text-gray-500 mb-1">{form.label(item)}</label>
                            {item.fieldType === "longtext" ? (
                              <textarea id={id} value={value} maxLength={2000} rows={3} onChange={(e) => set(e.target.value)} className={common} />
                            ) : item.fieldType === "date" ? (
                              <input id={id} type="date" value={value} onChange={(e) => set(e.target.value)} className={common} />
                            ) : item.fieldType === "choice" ? (
                              <select id={id} value={value} onChange={(e) => set(e.target.value)} className={common}>
                                <option value="">{t("selectPlaceholder")}</option>
                                {item.options.en.map((opt) => <option key={opt} value={opt}>{form.choice(item, opt)}</option>)}
                              </select>
                            ) : (
                              <input id={id} type="text" value={value} maxLength={300} onChange={(e) => set(e.target.value)} className={common} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{t("documents")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {docItems.map((item) => {
                      const field = item.key;
                      const review = detail.documentReview[field] ?? { status: "pending" as DocReviewStatus, note: "" };
                      return (
                        <div key={field} className={`rounded-xl border-2 p-2 ${DOC_STATUS_STYLES[review.status]}`}>
                          <p className="text-xs font-semibold text-gray-600 mb-1.5">{form.label(item)}</p>
                          {detail.hasDocument[field] ? (
                            <DocumentThumb
                              src={`/api/admin/buyer-profiles/${openId}/documents/${field}?v=${docVersion}`}
                              label={`${ta("viewer.enlarge")}: ${form.label(item)}`}
                              onOpen={() => setLightbox({ userId: openId, field, buyerName: form.label(item) })}
                              heightClass="h-20"
                            />
                          ) : (
                            <div className="h-20 w-full flex items-center justify-center rounded-lg bg-cream-50 text-xs text-gray-500 mb-1.5">{t("noFile")}</div>
                          )}
                          <input
                            type="file"
                            aria-label={form.label(item)}
                            accept="image/*,application/pdf"
                            disabled={uploadingField === field}
                            onChange={(e) => handleDocUpload(field, e.target.files?.[0] || null)}
                            className="w-full text-xs mb-1.5"
                          />
                          {detail.hasDocument[field] && <DocumentShare userId={openId} docKey={field} docLabel={form.label(item)} />}
                          {detail.hasDocument[field] && (
                            <>
                              <select
                                aria-label={`${form.label(item)} — ${t("verificationColumn")}`}
                                value={review.status}
                                disabled={reviewingField === field}
                                onChange={(e) => handleReviewChange(field, e.target.value as DocReviewStatus, review.note)}
                                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs mb-1.5"
                              >
                                <option value="pending">{t("docReview.pending")}</option>
                                <option value="verified">{t("docReview.verified")}</option>
                                <option value="rejected">{t("docReview.rejected")}</option>
                              </select>
                              {review.status === "rejected" && (
                                <input
                                  type="text"
                                  aria-label={t("docReview.notePlaceholder")}
                                  value={review.note}
                                  placeholder={t("docReview.notePlaceholder")}
                                  disabled={reviewingField === field}
                                  onChange={(e) =>
                                    setDetail((p) =>
                                      p ? { ...p, documentReview: { ...p.documentReview, [field]: { ...review, note: e.target.value } } } : p
                                    )
                                  }
                                  onBlur={(e) => handleReviewChange(field, "rejected", e.target.value)}
                                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                                />
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            </div>
            {/* Always in view, however far the form is scrolled. */}
            {!detailLoading && detail && (
              <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 bg-white px-6 py-4">
                <Button onClick={handleSave} disabled={saving} variant="save" size="compact">
                  {saving ? ta("saving") : ta("save")}
                </Button>
                <Button onClick={() => setOpenId(null)} variant="secondaryOutline" size="compact">{ta("close")}</Button>
                {error ? (
                  <span role="alert" className="text-sm text-red-700">{error}</span>
                ) : savedDetail !== null && detail === savedDetail ? (
                  <span role="status" className="text-sm font-semibold text-emerald-700">{t("profileSaved")}</span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {bulkOpen && <BulkPointsDialog userIds={Array.from(selected)} onClose={() => setBulkOpen(false)} onDone={() => loadRows()} />}
      {groupAnnounceOpen && <AnnounceDialog group userIds={[]} withEmail={0} onClose={() => setGroupAnnounceOpen(false)} />}
      {announceOpen && (
        <AnnounceDialog
          userIds={Array.from(selected)}
          withEmail={rows.filter((r) => selected.has(r.userId) && !!r.email && !isPlaceholderEmail(r.email)).length}
          onClose={() => setAnnounceOpen(false)}
        />
      )}
      {reviewOpen && (
        <BulkReviewDialog
          userIds={Array.from(selected)}
          documents={docItems}
          documentLabel={(item) => form.label(item)}
          onClose={() => setReviewOpen(false)}
          onDone={() => loadRows()}
        />
      )}
      {exportPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setExportPickerOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-heading">{t("exportPickerTitle")}</h2>
              <button onClick={() => setExportPickerOpen(false)} className="text-gray-500 hover:text-gray-600">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-1">{t("exportPickerHint", { count: selected.size })}</p>
            <p className="text-xs text-gray-500 mb-4">{t("exportAlwaysIncluded")}</p>

            <div className="flex gap-4 mb-3">
              <button
                type="button"
                onClick={() => setUnticked(new Set())}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
              >
                {t("selectAllFields")}
              </button>
              <button type="button" onClick={() => setUnticked(new Set(exportOrder))} className="text-xs font-semibold text-gray-500 hover:text-gray-700 underline">
                {t("deselectAllFields")}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mb-5">
              {[...TEXT_COLUMN_ORDER, ...form.fields.map((f) => f.key)].map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={exportFields.has(key)}
                    onChange={() => toggleExport(key)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  {form.fields.some((f) => f.key === key) ? form.label(form.fields.find((f) => f.key === key)!) : t(`fields.${key}`)}
                </label>
              ))}
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{t("documents")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mb-6">
              {docItems.map((item) => item.key).map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={exportFields.has(key)}
                    onChange={() => toggleExport(key)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  {docLabel(key)}
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <Button onClick={() => setExportPickerOpen(false)} variant="ghost" size="compact">{ta("cancel")}</Button>
              <Button onClick={runExportExcel} disabled={exportFields.size === 0 || exporting === "excel"} variant="save" size="compact">
                {exporting === "excel" ? ta("loading") : t("exportExcel")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {lightbox && (() => {
        const docStatus = rows.find((r) => r.userId === lightbox.userId)?.documents[lightbox.field]?.status ?? "pending";
        return (
          <DocumentLightbox
            src={`/api/admin/buyer-profiles/${lightbox.userId}/documents/${lightbox.field}`}
            title={`${lightbox.buyerName} — ${docLabel(lightbox.field)}`}
            statusLabel={t(`docReview.${docStatus}`)}
            statusClass={DOC_BADGE_STYLES[docStatus]}
            onClose={() => setLightbox(null)}
          />
        );
      })()}
    </div>
  );
}
