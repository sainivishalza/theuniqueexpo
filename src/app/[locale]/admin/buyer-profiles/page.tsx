"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import { NATIONALITIES } from "@/lib/expo-registrations";
import { DEPARTURE_CITIES, JOB_TITLES, VISA_TYPES } from "@/lib/buyer-profile-options";
import Button from "@/components/ui/Button";

type VerificationStatus = "not_started" | "pending_review" | "action_needed" | "verified";
type DocReviewStatus = "pending" | "verified" | "rejected";

interface AdminBuyerProfileRow {
  userId: number;
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
  registrationCode: string;
  sourceExhibitions: string;
  annualTurnover: string;
  contactPerson: string;
  dateOfBirth: string;
  visaType: string;
  visaExpireDate: string;
  purchaseIntention: string;
  otherPurchaseIntention: string;
  documentsUploaded: number;
  verificationStatus: VerificationStatus;
  documents: Record<string, { uploaded: boolean; status: DocReviewStatus }>;
}

// Every string field above is searchable from the one search box -- see
// `filtered` below.
type StringRowKey = { [K in keyof AdminBuyerProfileRow]: AdminBuyerProfileRow[K] extends string ? K : never }[keyof AdminBuyerProfileRow];
const SEARCHABLE_ROW_FIELDS: StringRowKey[] = [
  "name", "email", "companyName", "nationality", "passportNumber", "passportName",
  "gender", "wechatId", "departureCity", "attendanceDay", "meetingOrVisiting",
  "jobTitle", "companyField", "overseasCompanyAddress", "contactEmail",
  "registrationCode", "sourceExhibitions", "annualTurnover", "contactPerson", "dateOfBirth", "visaType",
  "visaExpireDate", "purchaseIntention", "otherPurchaseIntention",
];

interface DocReview {
  status: DocReviewStatus;
  note: string;
}

interface BuyerProfileDetail {
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
  dateOfBirth: string;
  visaType: string;
  visaExpireDate: string;
  hasDocument: Record<string, boolean>;
  documentReview: Record<string, DocReview>;
}

const STATUS_BADGE_STYLES: Record<VerificationStatus, string> = {
  not_started: "bg-gray-100 text-gray-500",
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

type DetailFieldKey = Exclude<keyof BuyerProfileDetail, "hasDocument" | "documentReview">;

interface FieldDef {
  key: DetailFieldKey;
  kind: "text" | "email" | "date" | "combo" | "select";
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
  { key: "sourceExhibitions", kind: "text" },
  { key: "departureCity", kind: "combo", options: DEPARTURE_CITIES },
  { key: "attendanceDay", kind: "text" },
  { key: "passportName", kind: "text" },
  { key: "wechatId", kind: "text" },
  { key: "overseasCompanyAddress", kind: "text" },
  { key: "companyField", kind: "text" },
  { key: "jobTitle", kind: "combo", options: JOB_TITLES },
  { key: "contactEmail", kind: "email" },
  { key: "dateOfBirth", kind: "date" },
  { key: "visaType", kind: "select", options: VISA_TYPES, translateOptions: false },
  { key: "visaExpireDate", kind: "date" },
  { key: "meetingOrVisiting", kind: "select", options: ["meeting", "visiting"] },
  { key: "gender", kind: "select", options: ["male", "female", "other"] },
];
const DOC_FIELDS = ["businessLicense", "businessCard", "passportFront", "visaPage", "cantonFairCard", "buyerPhoto", "invoiceOrderList"] as const;

const ZOOM_MIN = 1;
const ZOOM_MAX = 5;

// A minimal pan/zoom image viewer -- wheel or pinch to zoom, drag or
// single-finger swipe to pan once zoomed in, double-click/double-tap to
// toggle between fit and 2.5x. No new dependency for something this small.
function DocumentLightbox({
  src,
  title,
  statusLabel,
  statusClass,
  onClose,
}: {
  src: string;
  title: string;
  statusLabel: string;
  statusClass: string;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const lastTap = useRef(0);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function zoomTo(next: number) {
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
    setScale(clamped);
    if (clamped === ZOOM_MIN) setPos({ x: 0, y: 0 });
  }

  function toggleZoom() {
    zoomTo(scale > ZOOM_MIN ? ZOOM_MIN : 2.5);
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    zoomTo(scale - e.deltaY * 0.0015);
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (scale <= ZOOM_MIN) return;
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y };
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return;
    setPos({ x: dragStart.current.posX + (e.clientX - dragStart.current.x), y: dragStart.current.posY + (e.clientY - dragStart.current.y) });
  }
  function stopDrag() {
    dragging.current = false;
  }

  function touchDist(touches: React.TouchList) {
    return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  }
  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      pinchStart.current = { dist: touchDist(e.touches), scale };
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTap.current < 300) toggleZoom();
      lastTap.current = now;
      if (scale > ZOOM_MIN) {
        dragging.current = true;
        dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, posX: pos.x, posY: pos.y };
      }
    }
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchStart.current) {
      zoomTo(pinchStart.current.scale * (touchDist(e.touches) / pinchStart.current.dist));
    } else if (e.touches.length === 1 && dragging.current) {
      setPos({ x: dragStart.current.posX + (e.touches[0].clientX - dragStart.current.x), y: dragStart.current.posY + (e.touches[0].clientY - dragStart.current.y) });
    }
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinchStart.current = null;
    if (e.touches.length === 0) dragging.current = false;
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <div>
          <p className="font-semibold">{title}</p>
          <span className={`inline-block mt-1 rounded-lg px-2 py-0.5 text-xs font-semibold ${statusClass}`}>{statusLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => zoomTo(scale - 0.5)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg leading-none">−</button>
          <button type="button" onClick={() => zoomTo(scale + 0.5)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg leading-none">+</button>
          <button type="button" onClick={() => zoomTo(1)} className="px-3 h-8 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold">Reset</button>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg leading-none">✕</button>
        </div>
      </div>
      <div
        className="flex-1 overflow-hidden flex items-center justify-center touch-none select-none"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onDoubleClick={toggleZoom}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={src}
          alt={title}
          draggable={false}
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, cursor: scale > 1 ? "grab" : "default" }}
          className="max-h-full max-w-full object-contain transition-transform duration-75"
        />
      </div>
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
  const [error, setError] = useState("");

  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<BuyerProfileDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [docVersion, setDocVersion] = useState(0);
  const [reviewingField, setReviewingField] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ userId: number; field: string; buyerName: string } | null>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    loadRows();
  }, [user]);

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
      await loadRows();
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

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{t("accessDenied")}</p></div>;
  }

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return SEARCHABLE_ROW_FIELDS.some((field) => r[field].toLowerCase().includes(q));
  });

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
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4">
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

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full max-w-md rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          {loading ? (
            <p className="text-gray-500 text-center py-10">{ta("loading")}</p>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-cream-50 border-b border-gray-100">
                  <tr>
                    <th className="sticky left-0 z-10 bg-cream-50 text-left px-6 py-3 font-semibold text-gray-600 whitespace-nowrap">{ta("name")}</th>
                    {FIELDS.map((field) => (
                      <th key={field.key} className="text-left px-6 py-3 font-semibold text-gray-600 whitespace-nowrap">{t(`fields.${field.key}`)}</th>
                    ))}
                    <th className="text-left px-6 py-3 font-semibold text-gray-600 whitespace-nowrap">{t("fields.purchaseIntention")}</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-600 whitespace-nowrap">{t("fields.otherPurchaseIntention")}</th>
                    {DOC_FIELDS.map((field) => (
                      <th key={field} className="text-left px-6 py-3 font-semibold text-gray-600 whitespace-nowrap">{t(`docFields.${field}`)}</th>
                    ))}
                    <th className="text-left px-6 py-3 font-semibold text-gray-600 whitespace-nowrap">{t("verificationColumn")}</th>
                    <th className="text-right px-6 py-3 font-semibold text-gray-600 whitespace-nowrap">{ta("actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((r) => (
                    <tr key={r.userId} className="hover:bg-cream-50">
                      <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">{r.name}</div>
                        <div className="text-xs text-gray-400">{r.email}</div>
                      </td>
                      {FIELDS.map((field) => (
                        <td key={field.key} className="px-6 py-4 text-gray-700 whitespace-nowrap">{fieldDisplayValue(r, field)}</td>
                      ))}
                      <td className="px-6 py-4 text-gray-700 max-w-[220px] truncate" title={r.purchaseIntention}>{r.purchaseIntention || "—"}</td>
                      <td className="px-6 py-4 text-gray-700 max-w-[220px] truncate" title={r.otherPurchaseIntention}>{r.otherPurchaseIntention || "—"}</td>
                      {DOC_FIELDS.map((field) => {
                        const doc = r.documents[field];
                        return (
                          <td key={field} className="px-6 py-4 whitespace-nowrap">
                            {doc?.uploaded ? (
                              <button
                                type="button"
                                onClick={() => setLightbox({ userId: r.userId, field, buyerName: r.name })}
                                className="block"
                              >
                                <img
                                  src={`/api/admin/buyer-profiles/${r.userId}/documents/${field}`}
                                  alt={t(`docFields.${field}`)}
                                  loading="lazy"
                                  className="h-12 w-16 object-cover rounded-lg border border-gray-200 hover:border-emerald-400 transition-colors mb-1"
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
                        <Button onClick={() => openDetail(r.userId)} variant="ghost" size="xs">{ta("edit")}</Button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={FIELDS.length + DOC_FIELDS.length + 5} className="px-6 py-10 text-center text-gray-500">{t("noResults")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {openId !== null && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpenId(null)} />
          <div className="relative w-full max-w-xl bg-white h-full overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-heading">{t("editProfile")}</h2>
              <button onClick={() => setOpenId(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {detailLoading || !detail ? (
              <p className="text-gray-500">{ta("loading")}</p>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {FIELDS.map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">{t(`fields.${field.key}`)}</label>
                      {field.kind === "select" ? (
                        <select
                          value={detail[field.key]}
                          onChange={(e) => setDetail({ ...detail, [field.key]: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                        >
                          <option value="">{t("selectPlaceholder")}</option>
                          {field.options!.map((opt) => (
                            <option key={opt} value={opt}>{field.translateOptions === false ? opt : t(`fieldOptions.${field.key}.${opt}`)}</option>
                          ))}
                        </select>
                      ) : (
                        <>
                          <input
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
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{t("fields.purchaseIntention")}</label>
                  <textarea
                    value={detail.purchaseIntention}
                    onChange={(e) => setDetail({ ...detail, purchaseIntention: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{t("fields.otherPurchaseIntention")}</label>
                  <textarea
                    value={detail.otherPurchaseIntention}
                    onChange={(e) => setDetail({ ...detail, otherPurchaseIntention: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                <Button onClick={handleSave} disabled={saving} variant="save" size="compact">
                  {saving ? ta("saving") : ta("save")}
                </Button>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{t("documents")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {DOC_FIELDS.map((field) => {
                      const review = detail.documentReview[field] ?? { status: "pending" as DocReviewStatus, note: "" };
                      return (
                        <div key={field} className={`rounded-xl border-2 p-2 ${DOC_STATUS_STYLES[review.status]}`}>
                          <p className="text-xs font-semibold text-gray-600 mb-1.5">{t(`docFields.${field}`)}</p>
                          {detail.hasDocument[field] ? (
                            <img
                              src={`/api/admin/buyer-profiles/${openId}/documents/${field}?v=${docVersion}`}
                              alt={t(`docFields.${field}`)}
                              onClick={() => setLightbox({ userId: openId, field, buyerName: t(`docFields.${field}`) })}
                              className="h-20 w-full object-contain rounded-lg bg-cream-50 mb-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                            />
                          ) : (
                            <div className="h-20 w-full flex items-center justify-center rounded-lg bg-cream-50 text-xs text-gray-400 mb-1.5">{t("noFile")}</div>
                          )}
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            disabled={uploadingField === field}
                            onChange={(e) => handleDocUpload(field, e.target.files?.[0] || null)}
                            className="w-full text-xs mb-1.5"
                          />
                          {detail.hasDocument[field] && (
                            <>
                              <select
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
        </div>
      )}

      {lightbox && (() => {
        const docStatus = rows.find((r) => r.userId === lightbox.userId)?.documents[lightbox.field]?.status ?? "pending";
        return (
          <DocumentLightbox
            src={`/api/admin/buyer-profiles/${lightbox.userId}/documents/${lightbox.field}`}
            title={`${lightbox.buyerName} — ${t(`docFields.${lightbox.field}`)}`}
            statusLabel={t(`docReview.${docStatus}`)}
            statusClass={DOC_BADGE_STYLES[docStatus]}
            onClose={() => setLightbox(null)}
          />
        );
      })()}
    </div>
  );
}
