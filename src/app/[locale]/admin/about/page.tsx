"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import { DEFAULT_ABOUT_CONTENT, type AboutContent, type AboutLocale, type AboutStat, type AboutTranslation } from "@/lib/about-content";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

const EMPTY_TRANSLATION: AboutTranslation = { heading: "", tagline: "", story: "", mission: "", vision: "", stats: [] };
const LANGUAGES: { code: "en" | AboutLocale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  { code: "zh", label: "中文" },
];

export default function AdminAboutPage() {
  const t = useTranslations("adminAbout");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [content, setContent] = useState<AboutContent>(DEFAULT_ABOUT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  // Which language the text fields below edit; the hero image is shared.
  const [lang, setLang] = useState<"en" | AboutLocale>("en");
  const current: AboutTranslation = lang === "en" ? content : (content.translations?.[lang] ?? EMPTY_TRANSLATION);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch("/api/admin/about")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setContent(data.content);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  function update(patch: Partial<AboutContent>) {
    setContent((prev) => ({ ...prev, ...patch }));
  }

  // Translatable fields go to the selected language.
  function updateText(patch: Partial<AboutTranslation>) {
    if (lang === "en") {
      setContent((prev) => ({ ...prev, ...patch }));
    } else {
      setContent((prev) => ({
        ...prev,
        translations: { ...prev.translations, [lang]: { ...(prev.translations?.[lang] ?? EMPTY_TRANSLATION), ...patch } },
      }));
    }
  }

  function updateStat(index: number, patch: Partial<AboutStat>) {
    updateText({ stats: current.stats.map((s, i) => (i === index ? { ...s, ...patch } : s)) });
  }

  function addStat() {
    updateText({ stats: [...current.stats, { label: "", value: "" }] });
  }

  function removeStat(index: number) {
    updateText({ stats: current.stats.filter((_, i) => i !== index) });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/about", {
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
          <Link href="/admin" className="text-sm text-emerald-200 hover:text-white mb-4 inline-block">{ta("backToAdmin")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">
            {t.rich("subtitle", { link: (chunks) => <Link href="/about" target="_blank" className="underline hover:text-white">{chunks}</Link> })}
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
                {lang === "en" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{t("heroImageUrl")}</label>
                  <input
                    type="text"
                    value={content.heroImage}
                    onChange={(e) => update({ heroImage: e.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                )}
              </Card>

              <Card shadow="sm" bordered={false} className="p-6 space-y-3">
                <h2 className="font-bold text-heading">{t("ourStory")}</h2>
                <p className="text-xs text-gray-400">{t("storyHint")}</p>
                <textarea
                  value={current.story}
                  onChange={(e) => updateText({ story: e.target.value })}
                  rows={8}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y"
                />
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card shadow="sm" bordered={false} className="p-6 space-y-3">
                  <h2 className="font-bold text-heading">{t("mission")}</h2>
                  <textarea
                    value={current.mission}
                    onChange={(e) => updateText({ mission: e.target.value })}
                    rows={4}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y"
                  />
                </Card>
                <Card shadow="sm" bordered={false} className="p-6 space-y-3">
                  <h2 className="font-bold text-heading">{t("vision")}</h2>
                  <textarea
                    value={current.vision}
                    onChange={(e) => updateText({ vision: e.target.value })}
                    rows={4}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y"
                  />
                </Card>
              </div>

              <Card shadow="sm" bordered={false} className="p-6 space-y-4">
                <h2 className="font-bold text-heading">{t("stats")}</h2>
                {current.stats.map((stat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={stat.value}
                      onChange={(e) => updateStat(i, { value: e.target.value })}
                      placeholder="200+"
                      className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={stat.label}
                      onChange={(e) => updateStat(i, { label: e.target.value })}
                      placeholder={t("statLabelPlaceholder")}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <Button onClick={() => removeStat(i)} variant="linkDanger" size="inline" className="whitespace-nowrap">{ta("delete")}</Button>
                  </div>
                ))}
                <Button onClick={addStat} variant="dashedAdd" size="blockSm">
                  {t("addStat")}
                </Button>
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
