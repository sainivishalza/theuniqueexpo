"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import Button from "@/components/ui/Button";

interface AdminBuyerProfileRow {
  userId: number;
  name: string;
  email: string;
  status: "active" | "suspended";
  companyName: string;
  nationality: string;
  documentsUploaded: number;
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
  hasDocument: Record<string, boolean>;
}

const TEXT_FIELDS = ["companyName", "nationality", "passportNumber", "annualTurnover", "contactPerson", "registrationCode"] as const;
const DOC_FIELDS = ["businessLicense", "businessCard", "passportFront", "visaPage", "cantonFairCard", "buyerPhoto"] as const;

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

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{t("accessDenied")}</p></div>;
  }

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.companyName.toLowerCase().includes(q);
  });

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
                    <th className="text-left px-6 py-3 font-semibold text-gray-600">{ta("name")}</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("company")}</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("nationality")}</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("documentsColumn")}</th>
                    <th className="text-right px-6 py-3 font-semibold text-gray-600">{ta("actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((r) => (
                    <tr key={r.userId} className="hover:bg-cream-50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{r.name}</div>
                        <div className="text-xs text-gray-400">{r.email}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{r.companyName || "—"}</td>
                      <td className="px-6 py-4 text-gray-700">{r.nationality || "—"}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-lg bg-cream-50 px-2.5 py-1 text-xs font-semibold text-gray-600">{r.documentsUploaded} / 6</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button onClick={() => openDetail(r.userId)} variant="ghost" size="xs">{ta("edit")}</Button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">{t("noResults")}</td></tr>
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
                  {TEXT_FIELDS.map((field) => (
                    <div key={field}>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">{t(`fields.${field}`)}</label>
                      <input
                        type="text"
                        value={detail[field]}
                        onChange={(e) => setDetail({ ...detail, [field]: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                      />
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
                    {DOC_FIELDS.map((field) => (
                      <div key={field} className="rounded-xl border border-gray-200 p-2">
                        <p className="text-xs font-semibold text-gray-600 mb-1.5">{t(`docFields.${field}`)}</p>
                        {detail.hasDocument[field] ? (
                          <img
                            src={`/api/admin/buyer-profiles/${openId}/documents/${field}?v=${docVersion}`}
                            alt={t(`docFields.${field}`)}
                            className="h-20 w-full object-contain rounded-lg bg-cream-50 mb-1.5"
                          />
                        ) : (
                          <div className="h-20 w-full flex items-center justify-center rounded-lg bg-cream-50 text-xs text-gray-400 mb-1.5">{t("noFile")}</div>
                        )}
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          disabled={uploadingField === field}
                          onChange={(e) => handleDocUpload(field, e.target.files?.[0] || null)}
                          className="w-full text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
