"use client";
import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import { SITE_PAGES, isValidSitePageSlug, type SitePageContent, type SitePageItem, type SitePageTranslation, type TranslatedLocale } from "@/lib/site-pages";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

const EMPTY_CONTENT: SitePageContent = {
  heading: "", tagline: "", body: "", itemsLabel: "Details", items: [], contactEmail: "", contactPhone: "",
};

const EMPTY_TRANSLATION: SitePageTranslation = { heading: "", tagline: "", body: "", itemsLabel: "", items: [] };
const LANGUAGES: { code: "en" | TranslatedLocale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  { code: "zh", label: "中文" },
];

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
  // Which language's text the form below is editing. Russian/Chinese are
  // stored under content.translations; contact details are shared.
  const [lang, setLang] = useState<"en" | TranslatedLocale>("en");
  const current: SitePageTranslation = lang === "en" ? content : (content.translations?.[lang] ?? EMPTY_TRANSLATION);

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

  // Shared fields (contact details) always live on the English content.
  function update(patch: Partial<SitePageContent>) {
    setContent((prev) => ({ ...prev, ...patch }));
  }

  // Translatable fields go to the selected language.
  function updateText(patch: Partial<SitePageTranslation>) {
    if (lang === "en") {
      setContent((prev) => ({ ...prev, ...patch }));
    } else {
      setContent((prev) => ({
        ...prev,
        translations: { ...prev.translations, [lang]: { ...(prev.translations?.[lang] ?? EMPTY_TRANSLATION), ...patch } },
      }));
    }
  }

  function updateItem(index: number, patch: Partial<SitePageItem>) {
    updateText({ items: current.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) });
  }

  function addItem() {
    updateText({ items: [...current.items, { title: "", description: "" }] });
  }

  function removeItem(index: number) {
    updateText({ items: current.items.filter((_, i) => i !== index) });
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
      setError(errorMessage(err, ta("somethingWentWrong")));
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

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-4xl px-6 space-y-6">
          {loading ? (
            <p className="text-center text-gray-500 py-10">{ta("loading")}</p>
          ) : (
            <>
              <div role="tablist" aria-label={t("languageTabs")} className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    role="tab"
                    aria-selected={lang === l.code}
                    onClick={() => setLang(l.code)}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold border transition-colors ${lang === l.code ? "bg-emerald-900 text-white border-emerald-900" : "bg-white text-gray-600 border-gray-200 hover:bg-cream-50"}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              {lang !== "en" && <p className="text-xs text-gray-500">{t("translationHint")}</p>}

              <Card shadow="sm" bordered={false} className="p-6 space-y-5">
                <h2 className="font-bold text-heading">{t("header")}</h2>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{t("heading")}</label>
                  <input
                    type="text"
                    value={current.heading}
                    onChange={(e) => updateText({ heading: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{t("tagline")}</label>
                  <input
                    type="text"
                    value={current.tagline}
                    onChange={(e) => updateText({ tagline: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </Card>

              <Card shadow="sm" bordered={false} className="p-6 space-y-3">
                <h2 className="font-bold text-heading">{t("bodyText")}</h2>
                <p className="text-xs text-gray-400">{t("bodyHint")}</p>
                <textarea
                  value={current.body}
                  onChange={(e) => updateText({ body: e.target.value })}
                  rows={5}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y"
                />
              </Card>

              {lang === "en" && (
              <Card shadow="sm" bordered={false} className="p-6 space-y-4">
                <h2 className="font-bold text-heading">{t("contactDetails")}</h2>
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
              </Card>
              )}

              <Card shadow="sm" bordered={false} className="p-6 space-y-4">
                <div>
                  <h2 className="font-bold text-heading">{t("itemsList")}</h2>
                  <label className="block text-xs font-semibold text-gray-500 mt-3 mb-1">{t("sectionHeading")}</label>
                  <input
                    type="text"
                    value={current.itemsLabel}
                    onChange={(e) => updateText({ itemsLabel: e.target.value })}
                    placeholder="e.g. FAQs, Open Positions, Endpoints"
                    className="w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                {current.items.map((item, i) => (
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
                    <Button onClick={() => removeItem(i)} variant="linkDanger" size="inline">{ta("delete")}</Button>
                  </div>
                ))}
                <Button onClick={addItem} variant="dashedAdd" size="blockSm">
                  {t("addItem")}
                </Button>
              </Card>

              {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {saved && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{t("saved")}</div>}
              <Button onClick={handleSave} disabled={saving} variant="save" size="blockLg">
                {saving ? ta("saving") : t("saveButton", { name: pageDef.navLabel })}
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
