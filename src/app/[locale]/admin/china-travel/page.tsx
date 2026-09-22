"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import { readDocumentAsDataUrl } from "@/lib/client/image-upload";
import { DEFAULT_CHINA_TRAVEL_CONTENT, type ChinaTravelContent, type ChinaDestination, type ChinaRoute } from "@/lib/china-travel-content";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

const EMPTY_DESTINATION: ChinaDestination = { icon: "🏙️", name: "", tagline: "", highlights: [], image: "" };
const EMPTY_ROUTE: ChinaRoute = { title: "", duration: "", description: "" };

export default function AdminChinaTravelPage() {
  const t = useTranslations("adminChinaTravel");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [content, setContent] = useState<ChinaTravelContent>(DEFAULT_CHINA_TRAVEL_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch("/api/admin/china-travel-content")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setContent(data.content);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  function updateDestination(index: number, patch: Partial<ChinaDestination>) {
    setContent((prev) => ({
      ...prev,
      destinations: prev.destinations.map((d, i) => (i === index ? { ...d, ...patch } : d)),
    }));
  }

  function addDestination() {
    setContent((prev) => ({ ...prev, destinations: [...prev.destinations, { ...EMPTY_DESTINATION }] }));
  }

  function removeDestination(index: number) {
    setContent((prev) => ({ ...prev, destinations: prev.destinations.filter((_, i) => i !== index) }));
    setImageErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }

  async function handleDestinationImageFile(index: number, file: File | null) {
    setImageErrors((prev) => ({ ...prev, [index]: "" }));
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageErrors((prev) => ({ ...prev, [index]: t("chooseImageFile") }));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setImageErrors((prev) => ({ ...prev, [index]: t("imageTooLarge") }));
      return;
    }
    try {
      const dataUrl = await readDocumentAsDataUrl(file);
      updateDestination(index, { image: dataUrl });
    } catch {
      setImageErrors((prev) => ({ ...prev, [index]: t("couldNotReadFile") }));
    }
  }

  function updateRoute(index: number, patch: Partial<ChinaRoute>) {
    setContent((prev) => ({
      ...prev,
      routes: prev.routes.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));
  }

  function addRoute() {
    setContent((prev) => ({ ...prev, routes: [...prev.routes, { ...EMPTY_ROUTE }] }));
  }

  function removeRoute(index: number) {
    setContent((prev) => ({ ...prev, routes: prev.routes.filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/china-travel-content", {
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
            {t.rich("subtitle", { link: (chunks) => <Link href="/china-travel" target="_blank" className="underline hover:text-white">{chunks}</Link> })}
          </p>
        </div>
      </section>

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-4xl px-6 space-y-6">
          {loading ? (
            <p className="text-center text-gray-500 py-10">{ta("loading")}</p>
          ) : (
            <>
              <Card shadow="sm" bordered={false} className="p-6 space-y-4">
                <h2 className="font-bold text-heading">{t("destinations")}</h2>
                {content.destinations.map((dest, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 p-4 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={dest.icon}
                        onChange={(e) => updateDestination(i, { icon: e.target.value })}
                        placeholder="🏙️"
                        className="w-14 rounded-lg border border-gray-200 px-3 py-2 text-sm text-center"
                      />
                      <input
                        type="text"
                        value={dest.name}
                        onChange={(e) => updateDestination(i, { name: e.target.value })}
                        placeholder={t("destinationNamePlaceholder")}
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                      <Button onClick={() => removeDestination(i)} variant="linkDanger" size="inline" className="whitespace-nowrap">{ta("delete")}</Button>
                    </div>
                    <input
                      type="text"
                      value={dest.tagline}
                      onChange={(e) => updateDestination(i, { tagline: e.target.value })}
                      placeholder={t("destinationTaglinePlaceholder")}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={dest.highlights.join(", ")}
                      onChange={(e) => updateDestination(i, { highlights: e.target.value.split(",").map((h) => h.trim()).filter(Boolean) })}
                      placeholder={t("destinationHighlightsPlaceholder")}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <div className="flex gap-3 items-start pt-1">
                      <div className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-900 border border-gray-200">
                        {dest.image ? (
                          <img src={dest.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-xl gradient-brand">{dest.icon}</div>
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <input
                          type="text"
                          value={dest.image?.startsWith("data:") ? "" : dest.image || ""}
                          placeholder={dest.image?.startsWith("data:") ? t("uploadedImageSet") : "https://..."}
                          onChange={(e) => updateDestination(i, { image: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs"
                        />
                        <div className="flex items-center gap-3">
                          <label className="cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-cream-50 transition-colors">
                            {t("uploadPhoto")}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleDestinationImageFile(i, e.target.files?.[0] || null)}
                            />
                          </label>
                          {dest.image && (
                            <Button onClick={() => updateDestination(i, { image: "" })} variant="linkDanger" size="inline">
                              {t("removeImage")}
                            </Button>
                          )}
                        </div>
                        {imageErrors[i] && <p className="text-xs text-red-600">{imageErrors[i]}</p>}
                      </div>
                    </div>
                  </div>
                ))}
                <Button onClick={addDestination} variant="dashedAdd" size="blockSm">
                  {t("addDestination")}
                </Button>
              </Card>

              <Card shadow="sm" bordered={false} className="p-6 space-y-4">
                <h2 className="font-bold text-heading">{t("routes")}</h2>
                <p className="text-xs text-gray-400">{t("routesHint")}</p>
                {content.routes.map((route, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 p-4 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={route.title}
                        onChange={(e) => updateRoute(i, { title: e.target.value })}
                        placeholder={t("routeTitlePlaceholder")}
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={route.duration}
                        onChange={(e) => updateRoute(i, { duration: e.target.value })}
                        placeholder="5-7 days"
                        className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                      <Button onClick={() => removeRoute(i)} variant="linkDanger" size="inline" className="whitespace-nowrap">{ta("delete")}</Button>
                    </div>
                    <input
                      type="text"
                      value={route.description}
                      onChange={(e) => updateRoute(i, { description: e.target.value })}
                      placeholder={t("routeDescriptionPlaceholder")}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>
                ))}
                <Button onClick={addRoute} variant="dashedAdd" size="blockSm">
                  {t("addRoute")}
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
