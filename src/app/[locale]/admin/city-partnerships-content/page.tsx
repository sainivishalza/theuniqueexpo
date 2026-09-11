"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import { DEFAULT_CITY_PARTNERSHIPS_CONTENT, type CityPartnershipsContent, type CityPartnershipBenefit } from "@/lib/city-partnerships-content";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function AdminCityPartnershipsContentPage() {
  const t = useTranslations("adminCityPartnershipsContent");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [content, setContent] = useState<CityPartnershipsContent>(DEFAULT_CITY_PARTNERSHIPS_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch("/api/admin/city-partnerships-content")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setContent(data.content);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  function update(patch: Partial<CityPartnershipsContent>) {
    setContent((prev) => ({ ...prev, ...patch }));
  }

  function updateItem(index: number, patch: Partial<CityPartnershipBenefit>) {
    setContent((prev) => ({
      ...prev,
      benefits: prev.benefits.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  function addItem() {
    setContent((prev) => ({ ...prev, benefits: [...prev.benefits, { icon: "✨", title: "", desc: "" }] }));
  }

  function removeItem(index: number) {
    setContent((prev) => ({ ...prev, benefits: prev.benefits.filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/city-partnerships-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("saveFailed"));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{ta("accessRequired")}</p></div>;
  }

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-4xl px-6">
          <Link href="/admin/city-partnership-inquiries" className="text-sm text-emerald-200 hover:text-white mb-4 inline-block">{t("backToInquiries")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">
            {t.rich("subtitle", { link: (chunks) => <Link href="/city-partnerships" target="_blank" className="underline hover:text-white">{chunks}</Link> })}
          </p>
        </div>
      </section>

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-4xl px-6 space-y-6">
          {loading ? (
            <p className="text-center text-gray-500 py-10">{ta("loading")}</p>
          ) : (
            <>
              <Card shadow="sm" bordered={false} className="p-6 space-y-5">
                <h2 className="font-bold text-heading">{t("header")}</h2>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{t("fields.title")}</label>
                  <input type="text" value={content.title} onChange={(e) => update({ title: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{t("fields.subtitle")}</label>
                  <textarea value={content.subtitle} onChange={(e) => update({ subtitle: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{t("fields.heroImage")}</label>
                  <input type="text" value={content.heroImage} onChange={(e) => update({ heroImage: e.target.value })} placeholder="https://..." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                </div>
              </Card>

              <Card shadow="sm" bordered={false} className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-heading">{t("benefitItems")}</h2>
                  <Button onClick={addItem} variant="dashedAdd" size="xs">{t("addItem")}</Button>
                </div>
                <div className="space-y-4">
                  {content.benefits.map((item, i) => (
                    <div key={i} className="rounded-xl border border-gray-100 p-4 space-y-2">
                      <div className="flex gap-3 items-start">
                        <input
                          type="text"
                          value={item.icon}
                          onChange={(e) => updateItem(i, { icon: e.target.value })}
                          className="w-14 rounded-lg border border-gray-200 px-2 py-2 text-center text-lg"
                        />
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateItem(i, { title: e.target.value })}
                          placeholder={t("fields.itemTitle")}
                          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold"
                        />
                        <Button onClick={() => removeItem(i)} variant="linkDanger" size="inline" className="whitespace-nowrap">{ta("delete")}</Button>
                      </div>
                      <textarea
                        value={item.desc}
                        onChange={(e) => updateItem(i, { desc: e.target.value })}
                        rows={2}
                        placeholder={t("fields.itemDesc")}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y"
                      />
                    </div>
                  ))}
                </div>
              </Card>

              {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {saved && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{t("saved")}</div>}
              <Button onClick={handleSave} disabled={saving} variant="save" size="blockLg">
                {saving ? ta("saving") : t("saveButton")}
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
