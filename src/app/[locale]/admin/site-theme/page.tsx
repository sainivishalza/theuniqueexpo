"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import {
  DEFAULT_SITE_THEME, HEADING_FONT_OPTIONS, BODY_FONT_OPTIONS, SCRIPT_FONT_OPTIONS, CORNER_STYLE_OPTIONS,
  headingFontStack, bodyFontStack, scriptFontStack, cornerRadii,
  type SiteTheme, type HeadingFontKey, type BodyFontKey, type ScriptFontKey, type CornerStyleKey,
} from "@/lib/site-theme";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function AdminSiteThemePage() {
  const t = useTranslations("adminSiteTheme");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [theme, setTheme] = useState<SiteTheme>(DEFAULT_SITE_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch("/api/admin/site-theme")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTheme(data.theme);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  function update(patch: Partial<SiteTheme>) {
    setTheme((prev) => ({ ...prev, ...patch }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/site-theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(theme),
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

  const colorField = (key: "primaryColor" | "goldColor" | "backgroundColor" | "footerColor" | "heroColor" | "headingColor", label: string, hint: string) => (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <p className="text-xs text-gray-400 mb-2">{hint}</p>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={theme[key]}
          onChange={(e) => update({ [key]: e.target.value } as Partial<SiteTheme>)}
          className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
        />
        <input
          type="text"
          value={theme[key]}
          onChange={(e) => update({ [key]: e.target.value } as Partial<SiteTheme>)}
          className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
          maxLength={7}
        />
      </div>
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

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-4xl px-6 space-y-6">
          {loading ? (
            <p className="text-center text-gray-500 py-10">{ta("loading")}</p>
          ) : (
            <>
              <Card shadow="sm" bordered={false} className="p-6 space-y-6">
                <div>
                  <h2 className="font-bold text-heading">{t("colors")}</h2>
                  <p className="text-xs text-gray-400">{t("colorsHint")}</p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  {colorField("primaryColor", t("primaryColor"), t("primaryColorHint"))}
                  {colorField("goldColor", t("goldColor"), t("goldColorHint"))}
                  {colorField("backgroundColor", t("backgroundColor"), t("backgroundColorHint"))}
                  {colorField("footerColor", t("footerColor"), t("footerColorHint"))}
                  {colorField("heroColor", t("heroColor"), t("heroColorHint"))}
                  {colorField("headingColor", t("headingColor"), t("headingColorHint"))}
                </div>
              </Card>

              <Card shadow="sm" bordered={false} className="p-6 space-y-6">
                <div>
                  <h2 className="font-bold text-heading">{t("fonts")}</h2>
                  <p className="text-xs text-gray-400">{t("fontsHint")}</p>
                </div>
                <div className="grid gap-5 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{t("headingFont")}</label>
                    <select
                      value={theme.headingFont}
                      onChange={(e) => update({ headingFont: e.target.value as HeadingFontKey })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    >
                      {HEADING_FONT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{t("bodyFont")}</label>
                    <select
                      value={theme.bodyFont}
                      onChange={(e) => update({ bodyFont: e.target.value as BodyFontKey })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    >
                      {BODY_FONT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{t("scriptFont")}</label>
                    <select
                      value={theme.scriptFont}
                      onChange={(e) => update({ scriptFont: e.target.value as ScriptFontKey })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    >
                      {SCRIPT_FONT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
              </Card>

              <Card shadow="sm" bordered={false} className="p-6 space-y-6">
                <div>
                  <h2 className="font-bold text-heading">{t("cornerStyle")}</h2>
                  <p className="text-xs text-gray-400">{t("cornerStyleHint")}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {CORNER_STYLE_OPTIONS.map((o) => {
                    const radii = cornerRadii(o.key);
                    return (
                      <button
                        key={o.key}
                        type="button"
                        onClick={() => update({ cornerStyle: o.key as CornerStyleKey })}
                        className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                          theme.cornerStyle === o.key ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span
                          className="w-12 h-12 bg-gray-300"
                          style={{ borderRadius: radii["--radius-card"] }}
                        />
                        <span className="text-sm font-medium text-gray-700">{t(`cornerStyles.${o.key}`)}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card shadow="sm" bordered={false} className="p-6">
                <h2 className="font-bold text-heading mb-4">{t("preview")}</h2>
                <div className="rounded-2xl border border-gray-100 p-6 space-y-4" style={{ backgroundColor: theme.backgroundColor }}>
                  <h3 style={{ fontFamily: headingFontStack(theme.headingFont), color: theme.headingColor }} className="text-2xl font-bold uppercase">
                    {t("previewHeading")}
                  </h3>
                  <p style={{ fontFamily: bodyFontStack(theme.bodyFont) }} className="text-sm text-gray-600">
                    {t("previewBody")}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: theme.primaryColor, borderRadius: cornerRadii(theme.cornerStyle)["--radius-button"] }}>
                      {t("previewButton")}
                    </span>
                    <span className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: theme.goldColor, borderRadius: cornerRadii(theme.cornerStyle)["--radius-button"] }}>
                      {t("previewAccent")}
                    </span>
                    <span className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: theme.footerColor, borderRadius: cornerRadii(theme.cornerStyle)["--radius-button"] }}>
                      {t("previewFooter")}
                    </span>
                    <span className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: theme.heroColor, borderRadius: cornerRadii(theme.cornerStyle)["--radius-button"] }}>
                      {t("previewHero")}
                    </span>
                  </div>
                  <p style={{ fontFamily: scriptFontStack(theme.scriptFont), color: theme.primaryColor }} className="text-2xl">
                    {t("previewScript")}
                  </p>
                </div>
              </Card>

              {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {saved && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{t("saved")}</div>}
              <div className="flex gap-3">
                <Button onClick={() => setTheme(DEFAULT_SITE_THEME)} disabled={saving} variant="ghost" size="compact">
                  {t("resetButton")}
                </Button>
                <div className="flex-1">
                  <Button onClick={handleSave} disabled={saving} variant="save" size="blockLg">
                    {saving ? ta("saving") : t("saveButton")}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-400">{t("resetHint")}</p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
