"use client";
import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import type { ExpoRegistration } from "@/lib/expo-registrations";
import type { CustomFormField } from "@/lib/custom-registration-form";

interface Exhibition { id: string; slug: string; title: string; }
type RegistrationSummary = Pick<
  ExpoRegistration,
  "id" | "registrationType" | "fullName" | "gender" | "email" | "phone" | "nationality" |
  "companyName" | "companyWebsite" | "companyType" | "companyScale" | "purposeOfVisit" |
  "exportingMarkets" | "status" | "createdAt" | "customAnswers" | "formSchemaSnapshot"
>;

const STATUSES = ["pending", "approved", "rejected"];

function customSchemaOf(r: { formSchemaSnapshot?: unknown }): CustomFormField[] {
  return Array.isArray(r.formSchemaSnapshot) ? (r.formSchemaSnapshot as CustomFormField[]) : [];
}

function displayName(r: RegistrationSummary, fallback: string): string {
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
  const { user, loading: authLoading } = useAuth();
  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ExpoRegistration | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch(`/api/admin/expo-registrations?exhibition=${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setExhibition(data.exhibition);
        setRegistrations(data.registrations || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, slug]);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/expo-registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error || tr("updateFailed"));
      setRegistrations((prev) => prev.map((r) => (r.id === id ? { ...r, status: status as RegistrationSummary["status"] } : r)));
    } catch (err) {
      alert(errorMessage(err, "Something went wrong"));
    } finally {
      setUpdatingId(null);
    }
  }

  async function viewDetail(id: string) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/expo-registrations/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tr("loadDetailFailed"));
      setDetail(data.registration);
    } catch (err) {
      alert(errorMessage(err, "Something went wrong"));
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
          <Link href="/admin/exhibitions" className="text-sm text-emerald-200 hover:text-white mb-4 inline-block">{t("backToExhibitions")}</Link>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-white">{exhibition ? t("titleWithName", { name: exhibition.title }) : t("title")}</h1>
              <p className="mt-1 text-emerald-200/80">{loading ? ta("loading") : t("registeredCount", { count: registrations.length })}</p>
            </div>
            {exhibition && (
              <a
                href={`/api/admin/expo-registrations/export?exhibition=${exhibition.slug}`}
                className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                {t("exportToExcel")}
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          {error && <p className="text-red-600 text-center py-10">{error}</p>}
          {!loading && !error && registrations.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t("noResultsTitle")}</h3>
              <p className="text-gray-500">{t("noResultsSubtitle")}</p>
            </div>
          ) : !error && (
            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
              <table className="w-full text-sm"><thead className="bg-gray-50 border-b border-gray-100"><tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{ta("name")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("type")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("company")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("contact")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("purpose")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{ta("status")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{ta("date")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600"></th>
              </tr></thead><tbody className="divide-y divide-gray-100">
                {registrations.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{displayName(r, tr("registrationNumber", { id: r.id }))}<br/><span className="text-xs text-gray-400">{r.nationality || "—"}</span></td>
                    <td className="px-6 py-4 capitalize text-gray-700">{r.registrationType || (r.customAnswers ? t("customForm") : "—")}</td>
                    <td className="px-6 py-4 text-gray-500">{r.companyName || "—"}</td>
                    <td className="px-6 py-4 text-gray-500">{r.email || "—"}<br/><span className="text-xs text-gray-400">{r.phone || ""}</span></td>
                    <td className="px-6 py-4 text-gray-500">{r.purposeOfVisit || "—"}</td>
                    <td className="px-6 py-4">
                      <select
                        value={r.status}
                        disabled={updatingId === r.id}
                        onChange={(e) => updateStatus(r.id, e.target.value)}
                        className={`rounded-lg px-2 py-1 text-xs font-bold border-0 disabled:opacity-50 ${r.status === "approved" ? "bg-green-100 text-green-700" : r.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{tr(`statuses.${s}`)}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
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

      {(detail || detailLoading) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8" onClick={(e) => e.stopPropagation()}>
            {detailLoading && !detail ? (
              <p className="text-gray-500 text-center py-10">{ta("loading")}</p>
            ) : detail && (
              <>
                <div className="flex items-start justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">{displayName(detail, tr("registrationNumber", { id: detail.id }))}</h2>
                  <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                {detail.customAnswers ? (
                  <div className="space-y-4">
                    {customSchemaOf(detail).map((field) => {
                      const value = detail.customAnswers ? (detail.customAnswers as Record<string, unknown>)[field.id] : undefined;
                      return (
                        <div key={field.id}>
                          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{field.label}</p>
                          {field.type === "file" && typeof value === "string" && value ? (
                            <a href={value} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-gray-200 p-2 hover:border-emerald-400 max-w-xs">
                              {value.startsWith("data:image") ? (
                                <img src={value} alt={field.label} className="h-28 w-full object-contain rounded-lg bg-gray-50" />
                              ) : (
                                <div className="h-28 w-full flex items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500">{tr("viewFile")}</div>
                              )}
                            </a>
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
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{t("fields.companyIntro")}</p>
                        <p className="text-sm text-gray-700">{detail.companyIntro}</p>
                      </div>
                    )}
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-2">{t("documents")}</p>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: t("docs.passportFront"), src: detail.docPassportFront },
                        { label: t("docs.businessCard"), src: detail.docBusinessCard },
                        { label: t("docs.visaPage"), src: detail.docVisaPage },
                        { label: t("docs.businessLicense"), src: detail.docBusinessLicense },
                        { label: t("docs.orderList"), src: detail.docOrderList },
                      ].filter((d) => d.src).map((d) => (
                        <a key={d.label} href={d.src} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-gray-200 p-2 hover:border-emerald-400">
                          {d.src!.startsWith("data:image") ? (
                            <img src={d.src} alt={d.label} className="h-28 w-full object-contain rounded-lg bg-gray-50" />
                          ) : (
                            <div className="h-28 w-full flex items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500">{tr("viewFile")}</div>
                          )}
                          <p className="text-xs text-gray-500 mt-1 text-center">{d.label}</p>
                        </a>
                      ))}
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
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase">{label}</p>
      <p className={`text-gray-900 ${capitalize ? "capitalize" : ""}`}>{value}</p>
    </div>
  );
}
