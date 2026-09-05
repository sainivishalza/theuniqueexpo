"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import { DEFAULT_ABOUT_CONTENT, type AboutContent, type AboutStat } from "@/lib/about-content";

export default function AdminAboutPage() {
  const t = useTranslations("adminAbout");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [content, setContent] = useState<AboutContent>(DEFAULT_ABOUT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

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

  function updateStat(index: number, patch: Partial<AboutStat>) {
    setContent((prev) => ({
      ...prev,
      stats: prev.stats.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  }

  function addStat() {
    setContent((prev) => ({ ...prev, stats: [...prev.stats, { label: "", value: "" }] }));
  }

  function removeStat(index: number) {
    setContent((prev) => ({ ...prev, stats: prev.stats.filter((_, i) => i !== index) }));
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
      setError(errorMessage(err, "Something went wrong"));
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
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
                <h2 className="font-bold text-gray-900">{t("ourStory")}</h2>
                <p className="text-xs text-gray-400">{t("storyHint")}</p>
                <textarea
                  value={content.story}
                  onChange={(e) => update({ story: e.target.value })}
                  rows={8}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y"
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
                  <h2 className="font-bold text-gray-900">{t("mission")}</h2>
                  <textarea
                    value={content.mission}
                    onChange={(e) => update({ mission: e.target.value })}
                    rows={4}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y"
                  />
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
                  <h2 className="font-bold text-gray-900">{t("vision")}</h2>
                  <textarea
                    value={content.vision}
                    onChange={(e) => update({ vision: e.target.value })}
                    rows={4}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y"
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                <h2 className="font-bold text-gray-900">{t("stats")}</h2>
                {content.stats.map((stat, i) => (
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
                      placeholder="Exhibitions Supported"
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <button onClick={() => removeStat(i)} className="text-xs font-semibold text-red-600 hover:underline whitespace-nowrap">{ta("delete")}</button>
                  </div>
                ))}
                <button
                  onClick={addStat}
                  className="w-full rounded-xl border-2 border-dashed border-gray-300 py-2.5 text-sm font-semibold text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                >
                  {t("addStat")}
                </button>
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
