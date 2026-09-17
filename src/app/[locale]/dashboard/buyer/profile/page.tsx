"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import { readDocumentAsDataUrl } from "@/lib/client/image-upload";
import { NATIONALITIES } from "@/lib/expo-registrations";
import { DEPARTURE_CITIES, JOB_TITLES, VISA_TYPES } from "@/lib/buyer-profile-options";
import Button from "@/components/ui/Button";

type DocReviewStatus = "pending" | "verified" | "rejected";

interface DocReview {
  status: DocReviewStatus;
  note: string;
}

interface BuyerProfile {
  companyName: string;
  nationality: string;
  passportNumber: string;
  annualTurnover: string;
  purchaseIntention: string;
  otherPurchaseIntention: string;
  contactPerson: string;
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
  updatedAt: number;
}

type ProfileFieldKey = Exclude<keyof BuyerProfile, "hasDocument" | "documentReview" | "updatedAt">;

interface FieldDef {
  key: ProfileFieldKey;
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
const DOC_FIELDS = ["businessLicense", "businessCard", "passportFront", "visaPage", "cantonFairCard", "buyerPhoto"] as const;

const DOC_STATUS_BADGE: Record<DocReviewStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  verified: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
};

export default function BuyerProfilePage() {
  const t = useTranslations("buyerProfile");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [docVersion, setDocVersion] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetch("/api/buyer-profile")
      .then((r) => r.json())
      .then((data) => setProfile(data.profile))
      .catch((err) => setError(errorMessage(err, ta("somethingWentWrong"))))
      .finally(() => setLoading(false));
  }, [user, ta]);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/buyer-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("saveFailed"));
      setProfile(data.profile);
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setSaving(false);
    }
  }

  async function handleDocUpload(field: string, file: File | null) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError(t("fileTooLarge"));
      return;
    }
    setUploadingField(field);
    setError("");
    try {
      const dataUrl = await readDocumentAsDataUrl(file);
      const res = await fetch(`/api/buyer-profile/documents/${field}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("uploadFailed"));
      setProfile((p) => (p ? { ...p, hasDocument: { ...p.hasDocument, [field]: true } } : p));
      setDocVersion((v) => v + 1);
    } catch (err) {
      setError(errorMessage(err, t("uploadFailed")));
    } finally {
      setUploadingField(null);
    }
  }

  if (authLoading || loading) return null;
  if (!user) {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{t("loginRequired")}</p></div>;
  }
  if (!profile) return null;

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-4xl px-6">
          <Link href="/dashboard/buyer" className="inline-flex items-center gap-1.5 text-sm text-emerald-200/70 hover:text-white transition-colors mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            {t("backToDashboard")}
          </Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{t("subtitle")}</p>
        </div>
      </section>

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-4xl px-6 space-y-6">
          {error && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
          {saved && <div className="rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700">{t("saveSuccess")}</div>}

          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-heading">{t("companyInfo")}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t(`fields.${field.key}`)}</label>
                  {field.kind === "select" ? (
                    <select
                      value={profile[field.key]}
                      onChange={(e) => setProfile({ ...profile, [field.key]: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 outline-none bg-white"
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
                        value={profile[field.key]}
                        onChange={(e) => setProfile({ ...profile, [field.key]: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 outline-none bg-white"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("fields.purchaseIntention")}</label>
              <textarea
                value={profile.purchaseIntention}
                onChange={(e) => setProfile({ ...profile, purchaseIntention: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("fields.otherPurchaseIntention")}</label>
              <textarea
                value={profile.otherPurchaseIntention}
                onChange={(e) => setProfile({ ...profile, otherPurchaseIntention: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 outline-none bg-white"
              />
            </div>
            <Button onClick={handleSave} disabled={saving} variant="save" size="compact">
              {saving ? ta("saving") : ta("save")}
            </Button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-heading">{t("documents")}</h2>
            <p className="text-xs text-gray-400">{t("documentsHint")}</p>
            <div className="grid sm:grid-cols-3 gap-4">
              {DOC_FIELDS.map((field) => {
                const review = profile.documentReview[field];
                return (
                <div key={field} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <p className="text-xs font-semibold text-gray-600">{t(`docFields.${field}`)}</p>
                    {profile.hasDocument[field] && review && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${DOC_STATUS_BADGE[review.status]}`}>
                        {t(`docReviewStatus.${review.status}`)}
                      </span>
                    )}
                  </div>
                  {profile.hasDocument[field] ? (
                    <img
                      src={`/api/buyer-profile/documents/${field}?v=${docVersion}`}
                      alt={t(`docFields.${field}`)}
                      className="h-24 w-full object-contain rounded-lg bg-cream-50 mb-2"
                    />
                  ) : (
                    <div className="h-24 w-full flex items-center justify-center rounded-lg bg-cream-50 text-xs text-gray-400 mb-2">{t("noFile")}</div>
                  )}
                  {review?.status === "rejected" && review.note && (
                    <p className="text-xs text-red-600 mb-2">{t("docReviewStatus.rejectedReason", { reason: review.note })}</p>
                  )}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    disabled={uploadingField === field}
                    onChange={(e) => handleDocUpload(field, e.target.files?.[0] || null)}
                    className="w-full text-xs"
                  />
                </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
