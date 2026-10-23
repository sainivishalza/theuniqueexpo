"use client";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import type { ExpoRegistration } from "@/lib/expo-registrations";
import type { CustomFormField } from "@/lib/custom-registration-form";
import { REGISTRATION_STATUSES, type EffectiveStatus, type RegistrationStatus } from "@/lib/registration-lifecycle";
import { formatDateOnly, formatDateTime } from "@/lib/client/registration-format";
import { isValidUploadedDocument } from "@/lib/server/validate-upload";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import BulkDecisionDialog from "@/app/[locale]/admin/BulkDecisionDialog";
import SearchBox, { SearchEmpty, useListSearch } from "@/components/search/ListSearch";

interface Exhibition { id: string; slug: string; title: string; startDate: string; endDate: string; }
type RegistrationSummary = Pick<
  ExpoRegistration,
  "id" | "buyerNumber" | "registrationType" | "fullName" | "gender" | "email" | "phone" | "nationality" |
  "companyName" | "companyWebsite" | "companyType" | "companyScale" | "purposeOfVisit" |
  "exportingMarkets" | "createdAt" | "customAnswers" | "formSchemaSnapshot" |
  "approvedAt" | "confirmBy" | "confirmedAt" | "arrivalDate" | "arrivalNote" |
  "checkedInAt" | "checkedOutAt" | "cancelledAt" | "feedbackRating" | "feedbackComment" | "feedbackAt"
> & { status: RegistrationStatus; effectiveStatus: EffectiveStatus; hasTicket: boolean; waitlisted?: boolean };

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  confirmed: "bg-emerald-100 text-emerald-800",
  attended: "bg-teal-100 text-teal-800",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
  absent: "bg-orange-100 text-orange-700",
  expired: "bg-red-100 text-red-700",
};

function customSchemaOf(r: { formSchemaSnapshot?: unknown }): CustomFormField[] {
  return Array.isArray(r.formSchemaSnapshot) ? (r.formSchemaSnapshot as CustomFormField[]) : [];
}

function displayName(r: { fullName?: string | null; customAnswers?: Record<string, unknown> | null; formSchemaSnapshot?: unknown }, fallback: string): string {
  if (r.fullName) return r.fullName;
  const schema = customSchemaOf(r);
  const nameField = schema.find((f) => /name/i.test(f.label) && f.type !== "file");
  const value = nameField && r.customAnswers ? r.customAnswers[nameField.id] : null;
  return typeof value === "string" && value ? value : fallback;
}

function formatAnswer(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

export default function AdminExpoRegistrationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const t = useTranslations("adminExhibitionRegistrations");
  const tr = useTranslations("adminRegistrationsCommon");
  const ta = useTranslations("adminCommon");
  const tb = useTranslations("adminBulkDecision");
  const locale = useLocale();
  const { user, loading: authLoading } = useAuth();
  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationSummary[]>([]);
  const [places, setPlaces] = useState<{ quota: number; taken: number; waitlisted: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ExpoRegistration | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [defaultConfirmBy, setDefaultConfirmBy] = useState<string | null>(null);
  const [checkInPath, setCheckInPath] = useState("");
  // Approving asks for the date by which the buyer must confirm attendance.
  const [approving, setApproving] = useState<RegistrationSummary | null>(null);
  const [confirmByInput, setConfirmByInput] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [qrImage, setQrImage] = useState("");
  const [copied, setCopied] = useState(false);
  // Rows ticked for a bulk approve / reject.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<"approved" | "rejected" | null>(null);

  const load = useCallback(() => {
    return fetch(`/api/admin/expo-registrations?exhibition=${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setExhibition(data.exhibition);
        setRegistrations(data.registrations || []);
        setPlaces(data.places || null);
        setDefaultConfirmBy(data.defaultConfirmBy || null);
        setCheckInPath(data.checkInPath || "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    load();
  }, [user, load]);

  // The QR code points at the check-in page in the language the admin is using.
  const checkInUrl = useMemo(
    () => (checkInPath && typeof window !== "undefined" ? `${window.location.origin}/${locale}${checkInPath}` : ""),
    [checkInPath, locale]
  );

  useEffect(() => {
    if (!showQr || !checkInUrl) return;
    let stale = false;
    import("qrcode")
      .then((QR) => QR.toDataURL(checkInUrl, { width: 640, margin: 2, errorCorrectionLevel: "M" }))
      .then((url) => !stale && setQrImage(url))
      .catch(() => !stale && setQrImage(""));
    return () => {
      stale = true;
    };
  }, [showQr, checkInUrl]);

  async function updateStatus(id: string, status: string, confirmBy?: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/expo-registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(confirmBy ? { confirmBy } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || tr("updateFailed"));
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: data.status,
                effectiveStatus: data.effectiveStatus,
                confirmBy: data.confirmBy,
                approvedAt: data.approvedAt,
                confirmedAt: data.confirmedAt,
                checkedInAt: data.checkedInAt,
                checkedOutAt: data.checkedOutAt,
                cancelledAt: data.cancelledAt,
              }
            : r
        )
      );
      return true;
    } catch (err) {
      alert(errorMessage(err, ta("somethingWentWrong")));
      return false;
    } finally {
      setUpdatingId(null);
    }
  }

  function chooseStatus(r: RegistrationSummary, status: string) {
    if (status === "approved") {
      setConfirmByInput(r.confirmBy || defaultConfirmBy || "");
      setApproving(r);
      return;
    }
    updateStatus(r.id, status);
  }

  async function viewDetail(id: string) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/expo-registrations/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tr("loadDetailFailed"));
      setDetail(data.registration);
    } catch (err) {
      alert(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setDetailLoading(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(checkInUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the link is also shown for manual copying.
    }
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of registrations) c[r.effectiveStatus] = (c[r.effectiveStatus] || 0) + 1;
    return c;
  }, [registrations]);
  // A status that no registration has any more (everything pending was just approved) goes back to showing all of them.
  useEffect(() => {
    if (filter !== "all" && registrations.length > 0 && !counts[filter]) setFilter("all");
  }, [filter, counts, registrations.length]);
  const visible = useMemo(() => (filter === "all" ? registrations : registrations.filter((r) => r.effectiveStatus === filter)), [filter, registrations]);
  const search = useListSearch(visible);
  const ticked = registrations.filter((r) => selected.has(r.id));
  const shownIds = search.results.map((r) => r.id);
  const allShownTicked = shownIds.length > 0 && shownIds.every((id) => selected.has(id));
  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  // Ticks (or unticks) the rows the filter and search show now, and leaves the others as they are.
  function toggleShown() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allShownTicked) shownIds.forEach((id) => next.delete(id));
      else shownIds.forEach((id) => next.add(id));
      return next;
    });
  }
  const filterKeys = [...REGISTRATION_STATUSES.slice(0, 4), "expired", ...REGISTRATION_STATUSES.slice(4)] as string[];

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{ta("accessRequired")}</p></div>;
  }

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <Link href="/admin/exhibitions" className="text-sm text-emerald-200 hover:text-white mb-4 inline-block">{t("backToExhibitions")}</Link>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-white">{exhibition ? t("titleWithName", { name: exhibition.title }) : t("title")}</h1>
              <p className="mt-1 text-emerald-200/80">{loading ? ta("loading") : t("registeredCount", { count: registrations.length })}</p>
              {places && places.quota > 0 && (
                <p className="mt-1 text-sm font-semibold text-white" data-testid="places-summary">
                  {t("places", { taken: places.taken, quota: places.quota })}
                  {places.waitlisted > 0 && <span> · {t("waitingCount", { count: places.waitlisted })}</span>}
                </p>
              )}
            </div>
            {exhibition && (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowQr(true)}
                  className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
                >
                  {t("checkInQr.button")}
                </button>
                <a
                  href={`/api/admin/expo-registrations/export?exhibition=${encodeURIComponent(exhibition.slug)}`}
                  className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
                >
                  {t("exportToExcel")}
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-7xl px-6">
          {error && <p className="text-red-600 text-center py-10">{error}</p>}

          {!loading && !error && registrations.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label={t("filterByStatus")}>
              {["all", ...filterKeys.filter((k) => counts[k])].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => { setFilter(k); setSelected(new Set()); }}
                  aria-pressed={filter === k}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold border transition-colors ${filter === k ? "border-emerald-900 bg-emerald-900 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}
                >
                  {k === "all" ? t("filterAll", { count: registrations.length }) : `${tr(`statuses.${k}`)} (${counts[k]})`}
                </button>
              ))}
            </div>
          )}

          {!loading && !error && registrations.length > 0 && <SearchBox value={search.query} onChange={search.setQuery} shown={search.shown} total={search.total} />}
          {ticked.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2">
              <span className="text-sm font-semibold text-emerald-800">{tb("selectedCount", { count: ticked.length })}</span>
              <Button type="button" variant="secondaryOutline" size="xs" onClick={() => setBulk("approved")}>{tb("approve")}</Button>
              <Button type="button" variant="secondaryOutline" size="xs" onClick={() => setBulk("rejected")}>{tb("reject")}</Button>
              <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-emerald-700 hover:text-emerald-900 underline">{tb("clear")}</button>
            </div>
          )}
          {search.active && search.shown === 0 && <SearchEmpty query={search.query} onClear={() => search.setQuery("")} />}

          {!loading && !error && registrations.length === 0 ? (
            <Card shadow="sm" bordered={false} className="text-center py-20">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-heading mb-2">{t("noResultsTitle")}</h3>
              <p className="text-gray-500">{t("noResultsSubtitle")}</p>
            </Card>
          ) : !error && (
            <div className={`bg-white rounded-2xl shadow-sm max-h-[calc(100vh-6rem)] overflow-auto ${search.active && search.shown === 0 ? "hidden" : ""}`}>
              <table className="w-full text-sm"><thead className="bg-cream-50 border-b border-gray-100"><tr>
                <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 font-semibold text-gray-600">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={allShownTicked} onChange={toggleShown} className="h-4 w-4 rounded border-gray-300" aria-label={tb("selectAll")} />
                    {ta("name")}
                  </div>
                </th>
                <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 font-semibold text-gray-600">{t("type")}</th>
                <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 font-semibold text-gray-600">{t("company")}</th>
                <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 font-semibold text-gray-600">{t("contact")}</th>
                <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 font-semibold text-gray-600">{ta("status")}</th>
                <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 font-semibold text-gray-600">{t("progress")}</th>
                <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 font-semibold text-gray-600">{ta("date")}</th>
                <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 font-semibold text-gray-600"></th>
              </tr></thead><tbody className="divide-y divide-gray-100">
                {search.results.map((r) => (
                  <tr key={r.id} className="hover:bg-cream-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleRow(r.id)} className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300" aria-label={tb("selectRow", { name: displayName(r, tr("registrationNumber", { id: r.id })) })} />
                        <div>
                      {r.buyerNumber && <span className="block text-xs font-bold tracking-wide text-emerald-700">{r.buyerNumber}</span>}
                      {displayName(r, tr("registrationNumber", { id: r.id }))}<br/><span className="text-xs text-gray-500">{r.nationality || "—"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 capitalize text-gray-700">{r.registrationType || (r.customAnswers ? t("customForm") : "—")}</td>
                    <td className="px-6 py-4 text-gray-500">{r.companyName || "—"}</td>
                    <td className="px-6 py-4 text-gray-500">{r.email || "—"}<br/><span className="text-xs text-gray-500">{r.phone || ""}</span></td>
                    <td className="px-6 py-4">
                      <select
                        value={r.status}
                        disabled={updatingId === r.id}
                        aria-label={t("changeStatus", { name: displayName(r, tr("registrationNumber", { id: r.id })) })}
                        onChange={(e) => chooseStatus(r, e.target.value)}
                        className={`rounded-lg px-2 py-1 text-xs font-bold border-0 disabled:opacity-50 ${STATUS_STYLE[r.status] || STATUS_STYLE.pending}`}
                      >
                        {REGISTRATION_STATUSES.map((s) => <option key={s} value={s}>{tr(`statuses.${s}`)}</option>)}
                      </select>
                      {r.waitlisted && r.status === "pending" && (
                        <span className="ml-2 inline-block rounded-lg bg-gold-100 px-2 py-1 text-xs font-bold text-gold-800">{t("waitingList")}</span>
                      )}
                      {r.effectiveStatus === "expired" && (
                        <span className={`ml-2 inline-block rounded-lg px-2 py-1 text-xs font-bold ${STATUS_STYLE.expired}`}>{tr("statuses.expired")}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 space-y-0.5 min-w-[11rem]">
                      {r.status === "approved" && r.confirmBy && <div>{t("progressLines.confirmBy", { date: formatDateOnly(r.confirmBy, locale) })}</div>}
                      {r.confirmedAt && <div>{t("progressLines.confirmed", { date: formatDateTime(r.confirmedAt, locale) })}</div>}
                      {r.arrivalDate && <div>{t("progressLines.arrival", { date: formatDateOnly(r.arrivalDate, locale) })}</div>}
                      {r.hasTicket && <div>{t("progressLines.ticket")}</div>}
                      {r.checkedInAt && <div>{t("progressLines.checkedIn", { time: formatDateTime(r.checkedInAt, locale) })}</div>}
                      {r.checkedOutAt && <div>{t("progressLines.checkedOut", { time: formatDateTime(r.checkedOutAt, locale) })}</div>}
                      {r.feedbackRating && <div>{t("progressLines.feedback", { rating: r.feedbackRating })}</div>}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => viewDetail(r.id)} className="text-xs font-semibold text-emerald-600 hover:underline">{tr("view")}</button>
                    </td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
        </div>
      </section>

      {bulk && (
        <BulkDecisionDialog
          ids={ticked.map((r) => Number(r.id))}
          decision={bulk}
          defaultConfirmBy={defaultConfirmBy}
          onClose={() => { setBulk(null); setSelected(new Set()); }}
          onDone={() => { load(); }}
        />
      )}

      {/* Approve: choose the confirm-by date */}
      {approving && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onClick={() => setApproving(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="approve-title" className="bg-white rounded-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
            <h2 id="approve-title" className="text-xl font-bold text-heading mb-2">{t("approve.title", { name: displayName(approving, tr("registrationNumber", { id: approving.id })) })}</h2>
            <p className="text-sm text-gray-500 mb-5">{t("approve.hint")}</p>
            <label htmlFor="confirm-by" className="block text-sm font-medium text-gray-700 mb-1">{t("approve.confirmBy")}</label>
            <input
              id="confirm-by"
              type="date"
              value={confirmByInput}
              onChange={(e) => setConfirmByInput(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <p className="mt-2 text-xs text-gray-500">{defaultConfirmBy ? t("approve.leaveBlank") : t("approve.showOver")}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setApproving(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-cream-50">{ta("cancel")}</button>
              <button
                type="button"
                disabled={updatingId === approving.id}
                onClick={async () => {
                  if (await updateStatus(approving.id, "approved", confirmByInput || undefined)) setApproving(null);
                }}
                className="rounded-lg gradient-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {t("approve.submit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check-in QR code */}
      {showQr && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onClick={() => setShowQr(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="qr-title" className="bg-white rounded-2xl max-w-md w-full p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <h2 id="qr-title" className="text-xl font-bold text-heading mb-1">{t("checkInQr.title")}</h2>
            <p className="text-sm text-gray-500 mb-5">{t("checkInQr.hint")}</p>
            {qrImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrImage} alt={t("checkInQr.alt", { name: exhibition?.title || "" })} className="mx-auto w-64 h-64" />
            ) : (
              <p className="py-24 text-gray-500">{ta("loading")}</p>
            )}
            <p className="mt-4 text-xs text-gray-500 break-all">{checkInUrl}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <a
                href={qrImage || undefined}
                download={`${exhibition?.slug || "exhibition"}-check-in-qr.png`}
                aria-disabled={!qrImage}
                className={`rounded-lg gradient-brand px-4 py-2 text-sm font-semibold text-white ${qrImage ? "" : "opacity-50 pointer-events-none"}`}
              >
                {t("checkInQr.download")}
              </a>
              <button type="button" onClick={copyLink} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-cream-50">
                {copied ? t("checkInQr.copied") : t("checkInQr.copyLink")}
              </button>
              <button type="button" onClick={() => setShowQr(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-cream-50">{ta("close")}</button>
            </div>
          </div>
        </div>
      )}

      {(detail || detailLoading) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8" onClick={(e) => e.stopPropagation()}>
            {detailLoading && !detail ? (
              <p className="text-gray-500 text-center py-10">{ta("loading")}</p>
            ) : detail && (
              <>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    {detail.buyerNumber && <p className="text-sm font-bold tracking-wide text-emerald-700">{detail.buyerNumber}</p>}
                    <h2 className="text-2xl font-bold text-heading">{displayName(detail, tr("registrationNumber", { id: detail.id }))}</h2>
                  </div>
                  <button onClick={() => setDetail(null)} className="text-gray-500 hover:text-gray-600" aria-label={ta("close")}>✕</button>
                </div>

                {/* What happened after the sign-up form */}
                <div className="grid grid-cols-2 gap-4 text-sm mb-6 rounded-xl bg-cream-50 p-4">
                  <Detail label={ta("status")} value={tr(`statuses.${detail.effectiveStatus || detail.status}`)} capitalize />
                  <Detail label={t("lifecycle.confirmBy")} value={detail.confirmBy ? formatDateOnly(detail.confirmBy, locale) : "—"} />
                  <Detail label={t("lifecycle.approvedAt")} value={detail.approvedAt ? formatDateTime(detail.approvedAt, locale) : "—"} />
                  <Detail label={t("lifecycle.confirmedAt")} value={detail.confirmedAt ? formatDateTime(detail.confirmedAt, locale) : "—"} />
                  <Detail label={t("lifecycle.arrivalDate")} value={detail.arrivalDate ? formatDateOnly(detail.arrivalDate, locale) : "—"} />
                  <Detail label={t("lifecycle.arrivalNote")} value={detail.arrivalNote || "—"} />
                  <Detail label={t("lifecycle.checkedIn")} value={detail.checkedInAt ? formatDateTime(detail.checkedInAt, locale) : "—"} />
                  <Detail label={t("lifecycle.checkedOut")} value={detail.checkedOutAt ? formatDateTime(detail.checkedOutAt, locale) : "—"} />
                  <Detail label={t("lifecycle.cancelledAt")} value={detail.cancelledAt ? formatDateTime(detail.cancelledAt, locale) : "—"} />
                  <Detail label={t("lifecycle.feedback")} value={detail.feedbackRating ? `${"★".repeat(detail.feedbackRating)}${"☆".repeat(5 - detail.feedbackRating)}${detail.feedbackComment ? ` — ${detail.feedbackComment}` : ""}` : "—"} />
                </div>
                {detail.docTicket && (
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{t("lifecycle.ticket")}</p>
                    {isValidUploadedDocument(detail.docTicket) ? (
                      <a href={detail.docTicket} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-gray-200 p-2 hover:border-emerald-400 max-w-xs">
                        {detail.docTicket.startsWith("data:image") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={detail.docTicket} alt={t("lifecycle.ticket")} className="h-28 w-full object-contain rounded-lg bg-cream-50" />
                        ) : (
                          <div className="h-28 w-full flex items-center justify-center rounded-lg bg-cream-50 text-sm text-gray-500">{tr("viewFile")}</div>
                        )}
                      </a>
                    ) : (
                      <div className="max-w-xs rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">{tr("invalidFile")}</div>
                    )}
                  </div>
                )}

                {detail.customAnswers ? (
                  <div className="space-y-4">
                    {customSchemaOf(detail).map((field) => {
                      const value = detail.customAnswers ? (detail.customAnswers as Record<string, unknown>)[field.id] : undefined;
                      return (
                        <div key={field.id}>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{field.label}</p>
                          {field.type === "file" && typeof value === "string" && value ? (
                            isValidUploadedDocument(value) ? (
                              <a href={value} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-gray-200 p-2 hover:border-emerald-400 max-w-xs">
                                {value.startsWith("data:image") ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={value} alt={field.label} className="h-28 w-full object-contain rounded-lg bg-cream-50" />
                                ) : (
                                  <div className="h-28 w-full flex items-center justify-center rounded-lg bg-cream-50 text-sm text-gray-500">{tr("viewFile")}</div>
                                )}
                              </a>
                            ) : (
                              <div className="max-w-xs rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">{tr("invalidFile")}</div>
                            )
                          ) : (
                            <p className="text-gray-900 text-sm">{formatAnswer(value)}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                      <Detail label={t("fields.registrationType")} value={detail.registrationType || "—"} capitalize />
                      <Detail label={t("fields.gender")} value={detail.gender || "—"} capitalize />
                      <Detail label={t("fields.nationality")} value={detail.nationality || "—"} />
                      <Detail label={t("fields.passportNumber")} value={detail.passportNumber || "—"} />
                      <Detail label={ta("email")} value={detail.email || "—"} />
                      <Detail label={t("fields.phone")} value={detail.phone || "—"} />
                      <Detail label={t("fields.company")} value={detail.companyName || "—"} />
                      <Detail label={t("fields.website")} value={detail.companyWebsite || "—"} />
                      <Detail label={t("fields.companyType")} value={detail.companyType === "Other" ? (detail.companyTypeOther || "—") : (detail.companyType || "—")} />
                      <Detail label={t("fields.companyScale")} value={detail.companyScale || "—"} />
                      <Detail label={t("fields.purposeOfVisit")} value={detail.purposeOfVisit || "—"} />
                      <Detail label={t("fields.infoSource")} value={detail.infoSource === "Other" ? (detail.infoSourceOther || "—") : (detail.infoSource || "—")} />
                      <Detail label={t("fields.exportingMarkets")} value={(detail.exportingMarkets || []).map((m) => (m === "Other" ? detail.exportingMarketOther : m)).join(", ") || "—"} />
                    </div>
                    {detail.companyIntro && (
                      <div className="mb-6">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{t("fields.companyIntro")}</p>
                        <p className="text-sm text-gray-700">{detail.companyIntro}</p>
                      </div>
                    )}
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{t("documents")}</p>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: t("docs.passportFront"), src: detail.docPassportFront },
                        { label: t("docs.businessCard"), src: detail.docBusinessCard },
                        { label: t("docs.visaPage"), src: detail.docVisaPage },
                        { label: t("docs.businessLicense"), src: detail.docBusinessLicense },
                        { label: t("docs.orderList"), src: detail.docOrderList },
                      ].filter((d) => d.src).map((d) =>
                        isValidUploadedDocument(d.src) ? (
                          <a key={d.label} href={d.src} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-gray-200 p-2 hover:border-emerald-400">
                            {d.src!.startsWith("data:image") ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={d.src} alt={d.label} className="h-28 w-full object-contain rounded-lg bg-cream-50" />
                            ) : (
                              <div className="h-28 w-full flex items-center justify-center rounded-lg bg-cream-50 text-sm text-gray-500">{tr("viewFile")}</div>
                            )}
                            <p className="text-xs text-gray-500 mt-1 text-center">{d.label}</p>
                          </a>
                        ) : (
                          <div key={d.label} className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                            {d.label}: {tr("invalidFile")}
                          </div>
                        )
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-gray-500 uppercase">{label}</p>
      <p className={`text-gray-900 [overflow-wrap:anywhere] ${capitalize ? "capitalize" : ""}`}>{value}</p>
    </div>
  );
}
