"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import { DEFAULT_COMPANY_PROFILE, type CompanyProfile } from "@/lib/company-profile";

export default function AdminCompanyProfilePage() {
  const t = useTranslations("adminCompanyProfile");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<CompanyProfile>(DEFAULT_COMPANY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch("/api/admin/company-profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setProfile(data.profile);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  function update(patch: Partial<CompanyProfile>) {
    setProfile((prev) => ({ ...prev, ...patch }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/company-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("saveFailed"));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(errorMessage(err, "Something went wrong"));
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{ta("accessRequired")}</p></div>;
  }

  const field = (key: keyof CompanyProfile, label: string, placeholder = "") => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <input
        type="text"
        value={profile[key]}
        onChange={(e) => update({ [key]: e.target.value } as Partial<CompanyProfile>)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
      />
    </div>
  );

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-4xl px-6">
          <Link href="/admin" className="text-sm text-emerald-200 hover:text-white mb-4 inline-block">{ta("backToAdmin")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{t("subtitle")}</p>
        </div>
      </section>

      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-4xl px-6 space-y-6">
          {loading ? (
            <p className="text-center text-gray-500 py-10">{ta("loading")}</p>
          ) : (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
                <h2 className="font-bold text-gray-900">{t("identity")}</h2>
                <p className="text-xs text-gray-400">{t("identityHint")}</p>
                {field("legalName", t("legalName"))}
                {field("logoUrl", t("logoUrl"), "https://...")}
                {field("contactEmail", t("contactEmail"))}
                {field("phone", t("phone"), "+86 ...")}
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
                <h2 className="font-bold text-gray-900">{t("address")}</h2>
                <p className="text-xs text-gray-400">{t("addressHint")}</p>
                {field("addressLine", t("addressLine"))}
                <div className="grid grid-cols-2 gap-4">
                  {field("addressCity", t("addressCity"))}
                  {field("addressCountry", t("addressCountry"))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
                <h2 className="font-bold text-gray-900">{t("social")}</h2>
                <p className="text-xs text-gray-400">{t("socialHint")}</p>
                {field("socialLinkedIn", "LinkedIn", "https://linkedin.com/company/...")}
                {field("socialFacebook", "Facebook", "https://facebook.com/...")}
                {field("socialInstagram", "Instagram", "https://instagram.com/...")}
                {field("socialX", "X (Twitter)", "https://x.com/...")}
                {field("socialYoutube", "YouTube", "https://youtube.com/@...")}
              </div>

              {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {saved && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{t("saved")}</div>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-xl gradient-brand py-4 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? ta("saving") : t("saveButton")}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
