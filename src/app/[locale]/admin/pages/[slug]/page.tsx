"use client";
import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import { SITE_PAGES, isValidSitePageSlug, type SitePageContent, type SitePageItem } from "@/lib/site-pages";

const EMPTY_CONTENT: SitePageContent = {
  heading: "", tagline: "", body: "", itemsLabel: "Details", items: [], contactEmail: "", contactPhone: "",
};

export default function AdminSitePageEditor({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const t = useTranslations("adminSitePageEditor");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [content, setContent] = useState<SitePageContent>(EMPTY_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const pageDef = SITE_PAGES.find((p) => p.slug === slug);

  useEffect(() => {
    if (!user || user.role !== "admin" || !isValidSitePageSlug(slug)) return;
    fetch(`/api/admin/pages/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setContent(data.content);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, slug]);

  function update(patch: Partial<SitePageContent>) {
    setContent((prev) => ({ ...prev, ...patch }));
  }

  function updateItem(index: number, patch: Partial<SitePageItem>) {
    setContent((prev) => ({ ...prev, items: prev.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) }));
  }

  function addItem() {
    setContent((prev) => ({ ...prev, items: [...prev.items, { title: "", description: "" }] }));
  }

  function removeItem(index: number) {
    setContent((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/pages/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
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
  if (!pageDef) {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{t("unknownPage")}</p></div>;
  }

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-4xl px-6">
          <Link href="/admin/pages" className="text-sm text-emerald-200 hover:text-white mb-4 inline-block">{t("backToWebsitePages")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{pageDef.navLabel}</h1>
          <p className="mt-1 text-emerald-200/80">
            {t.rich("subtitle", { path: pageDef.path, link: (chunks) => <Link href={pageDef.path} target="_blank" className="underline hover:text-white">{chunks}</Link> })}
          </p>
        </div>
      </section>

      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-4xl px-6 space-y-6">
          {loading ? (
            <p className="text-center text-gray-500 py-10">{ta("loading")}</p>
          ) : (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
                <h2 className="font-bold text-gray-900">{t("header")}</h2>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{t("heading")}</label>
                  <input
                    type="text"
                    value={content.heading}
                    onChange={(e) => update({ heading: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{t("tagline")}</label>
                  <input
                    type="text"
                    value={content.tagline}
                    onChange={(e) => update({ tagline: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
                <h2 className="font-bold text-gray-900">{t("bodyText")}</h2>
                <p className="text-xs text-gray-400">{t("bodyHint")}</p>
                <textarea
                  value={content.body}
                  onChange={(e) => update({ body: e.target.value })}
                  rows={5}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                <h2 className="font-bold text-gray-900">{t("contactDetails")}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{ta("email")}</label>
                    <input
                      type="text"
                      value={content.contactEmail}
                      onChange={(e) => update({ contactEmail: e.target.value })}
                      placeholder="info@theuniqueexpo.com"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t("phone")}</label>
                    <input
                      type="text"
                      value={content.contactPhone}
                      onChange={(e) => update({ contactPhone: e.target.value })}
                      placeholder="+86 400 000 0000"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                <div>
                  <h2 className="font-bold text-gray-900">{t("itemsList")}</h2>
                  <label className="block text-xs font-semibold text-gray-500 mt-3 mb-1">{t("sectionHeading")}</label>
                  <input
                    type="text"
                    value={content.itemsLabel}
                    onChange={(e) => update({ itemsLabel: e.target.value })}
                    placeholder="e.g. FAQs, Open Positions, Endpoints"
                    className="w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                {content.items.map((item, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 p-4 space-y-2">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateItem(i, { title: e.target.value })}
                      placeholder={t("itemTitle")}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold"
                    />
                    <textarea
                      value={item.description}
                      onChange={(e) => updateItem(i, { description: e.target.value })}
                      placeholder={t("itemDescription")}
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y"
                    />
                    <button onClick={() => removeItem(i)} className="text-xs font-semibold text-red-600 hover:underline">{ta("delete")}</button>
                  </div>
                ))}
                <button
                  onClick={addItem}
                  className="w-full rounded-xl border-2 border-dashed border-gray-300 py-2.5 text-sm font-semibold text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                >
                  {t("addItem")}
                </button>
              </div>

              {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {saved && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{t("saved")}</div>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-xl gradient-brand py-4 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? ta("saving") : t("saveButton", { name: pageDef.navLabel })}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
