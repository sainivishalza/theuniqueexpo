"use client";
import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import type { CustomFormField } from "@/lib/custom-registration-form";
import { isValidUploadedDocument } from "@/lib/server/validate-upload";
import Card from "@/components/ui/Card";
import BulkStatusBar, { bulkOptions } from "../../../BulkStatusBar";
import SearchBox, { SearchEmpty, useListSearch } from "@/components/search/ListSearch";

interface Tour { id: string; slug: string; title: string; }
interface RegistrationSummary {
  id: string;
  status: string;
  createdAt: string;
  customAnswers: Record<string, unknown> | null;
  formSchemaSnapshot: CustomFormField[] | null;
}
interface RegistrationDetail extends RegistrationSummary {
  tourId: string;
  userId: string;
}

const STATUSES = ["pending", "approved", "rejected"];

function schemaOf(r: { formSchemaSnapshot: CustomFormField[] | null }): CustomFormField[] {
  return Array.isArray(r.formSchemaSnapshot) ? r.formSchemaSnapshot : [];
}

function displayName(r: RegistrationSummary, fallback: string): string {
  const schema = schemaOf(r);
  const nameField = schema.find((f) => /name/i.test(f.label) && f.type !== "file");
  const value = nameField && r.customAnswers ? r.customAnswers[nameField.id] : null;
  return typeof value === "string" && value ? value : fallback;
}

function formatAnswer(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

export default function AdminTourRegistrationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const t = useTranslations("adminTourRegistrations");
  const tr = useTranslations("adminRegistrationsCommon");
  const ta = useTranslations("adminCommon");
  const tb = useTranslations("adminBulkDecision");
  const tbo = useTranslations("adminBulkOther");
  const { user, loading: authLoading } = useAuth();
  const [tour, setTour] = useState<Tour | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationSummary[]>([]);
  const search = useListSearch(registrations);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RegistrationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [ticked, setTicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch(`/api/admin/tour-registrations?tour=${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTour(data.tour);
        setRegistrations(data.registrations || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, slug]);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/tour-registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error || tr("updateFailed"));
      setRegistrations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (err) {
      alert(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setUpdatingId(null);
    }
  }

  async function viewDetail(id: string) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/tour-registrations/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tr("loadDetailFailed"));
      setDetail(data.registration);
    } catch (err) {
      alert(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setDetailLoading(false);
    }
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{ta("accessRequired")}</p></div>;
  }

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <Link href="/admin/tours" className="py-1 text-sm text-emerald-200 hover:text-white mb-4 inline-block">{t("backToTours")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{tour ? t("titleWithName", { name: tour.title }) : t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{loading ? ta("loading") : t("travelersRegistered", { count: registrations.length })}</p>
        </div>
      </section>

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-7xl px-6">
          {error && <p className="text-red-600 text-center py-10">{error}</p>}
          {!loading && !error && registrations.length === 0 ? (
            <Card shadow="sm" bordered={false} className="text-center py-20">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-heading mb-2">{t("noResultsTitle")}</h3>
              <p className="text-gray-500">{t("noResultsSubtitle")}</p>
            </Card>
          ) : !error && (
            <>
              <BulkStatusBar
                endpoint="/api/admin/tour-registrations/bulk-status"
                ids={Array.from(ticked)}
                options={bulkOptions(["approved", "rejected"], tbo)}
                onApplied={(changed, status) => { setRegistrations((prev) => prev.map((r) => (changed.includes(r.id) ? { ...r, status } : r))); setTicked(new Set()); }}
                onClear={() => setTicked(new Set())}
              />
              <SearchBox value={search.query} onChange={search.setQuery} shown={search.shown} total={search.total} />
              {search.active && search.shown === 0 && <SearchEmpty query={search.query} onClear={() => search.setQuery("")} />}
              <div className={`bg-white rounded-2xl shadow-sm max-h-[calc(100vh-6rem)] overflow-auto ${search.active && search.shown === 0 ? "hidden" : ""}`}>
              <table className="w-full text-sm"><thead className="bg-cream-50 border-b border-gray-100"><tr>
                <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 w-10">
                  <input type="checkbox" aria-label={tb("selectAll")} checked={search.results.length > 0 && search.results.every((r) => ticked.has(r.id))}
                    onChange={() => setTicked((prev) => (search.results.every((r) => prev.has(r.id)) ? new Set() : new Set(search.results.map((r) => r.id))))} className="h-4 w-4 rounded border-gray-300" />
                </th>
                <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 font-semibold text-gray-600">{t("traveler")}</th>
                <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 font-semibold text-gray-600">{ta("status")}</th>
                <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 font-semibold text-gray-600">{ta("date")}</th>
                <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 font-semibold text-gray-600"></th>
              </tr></thead><tbody className="divide-y divide-gray-100">
                {search.results.map((r) => (
                  <tr key={r.id} className="hover:bg-cream-50">
                    <td className="px-6 py-4">
                      <input type="checkbox" checked={ticked.has(r.id)} onChange={() => setTicked((prev) => { const next = new Set(prev); if (next.has(r.id)) next.delete(r.id); else next.add(r.id); return next; })}
                        aria-label={tb("selectRow", { name: displayName(r, tr("registrationNumber", { id: r.id })) })} className="h-4 w-4 rounded border-gray-300" />
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{displayName(r, tr("registrationNumber", { id: r.id }))}</td>
                    <td className="px-6 py-4">
                      <select
                        aria-label={`${ta("status")}: ${displayName(r, tr("registrationNumber", { id: r.id }))}`}
                        value={r.status}
                        disabled={updatingId === r.id}
                        onChange={(e) => updateStatus(r.id, e.target.value)}
                        className={`rounded-lg px-2 py-1 text-xs font-bold border-0 disabled:opacity-50 ${r.status === "approved" ? "bg-green-100 text-green-700" : r.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{tr(`statuses.${s}`)}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => viewDetail(r.id)} className="text-xs font-semibold text-emerald-600 hover:underline">{tr("view")}</button>
                    </td>
                  </tr>
                ))}
              </tbody></table>
            </div></>
          )}
        </div>
      </section>

      {(detail || detailLoading) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8" onClick={(e) => e.stopPropagation()}>
            {detailLoading && !detail ? (
              <p className="text-gray-500 text-center py-10">{ta("loading")}</p>
            ) : detail && (
              <>
                <div className="flex items-start justify-between mb-6">
                  <h2 className="text-2xl font-bold text-heading">{displayName(detail, tr("registrationNumber", { id: detail.id }))}</h2>
                  <button onClick={() => setDetail(null)} className="text-gray-500 hover:text-gray-600">✕</button>
                </div>
                <div className="space-y-4">
                  {schemaOf(detail).map((field) => {
                    const value = detail.customAnswers ? detail.customAnswers[field.id] : undefined;
                    return (
                      <div key={field.id}>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{field.label}</p>
                        {field.type === "file" && typeof value === "string" && value ? (
                          isValidUploadedDocument(value) ? (
                            <a href={value} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-gray-200 p-2 hover:border-emerald-400 max-w-xs">
                              {value.startsWith("data:image") ? (
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
