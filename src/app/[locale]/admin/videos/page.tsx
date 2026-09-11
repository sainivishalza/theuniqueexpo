"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@/i18n/navigation";
import { errorMessage } from "@/lib/format";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import VideoEmbed from "@/components/VideoEmbed";

interface Video {
  id: string;
  title: string;
  description: string;
  embedUrl: string;
  category: string;
  relatedType: string;
  relatedId: string;
  displayOrder: number;
}

const EMPTY_FORM = { title: "", description: "", embedUrl: "", category: "", relatedType: "", relatedId: "", displayOrder: 0 };

export default function AdminVideosPage() {
  const t = useTranslations("adminVideos");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    void loadVideos();
  }, [user]);

  async function loadVideos() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/videos");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("loadFailed"));
      setVideos(data.videos);
    } catch (err) {
      setError(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setLoading(false);
    }
  }

  function openEdit(video: Video) {
    setForm({
      title: video.title,
      description: video.description,
      embedUrl: video.embedUrl,
      category: video.category,
      relatedType: video.relatedType,
      relatedId: video.relatedId,
      displayOrder: video.displayOrder,
    });
    setFormError("");
    setEditingId(video.id);
    setShowNew(false);
  }

  function openNew() {
    setForm({ ...EMPTY_FORM, displayOrder: videos.length });
    setFormError("");
    setShowNew(true);
    setEditingId(null);
  }

  function closeForm() {
    setEditingId(null);
    setShowNew(false);
  }

  async function handleSave() {
    if (!form.title || !form.embedUrl) {
      setFormError(t("requiredFieldsError"));
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const url = editingId ? `/api/admin/videos/${editingId}` : "/api/admin/videos";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("saveFailed"));
      closeForm();
      await loadVideos();
    } catch (err) {
      setFormError(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("confirmDelete"))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/videos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || t("deleteFailed"));
      setVideos((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      alert(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setDeletingId(null);
    }
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{t("accessDenied")}</p></div>;
  }

  const showForm = showNew || editingId !== null;

  return (
    <div>
      <section className="bg-[var(--color-hero-bg)] py-8">
        <div className="mx-auto max-w-4xl px-6">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            {t("backToAdmin")}
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
            <Button onClick={openNew} variant="gradientCta" size="compact">{t("newVideo")}</Button>
          </div>
          <p className="mt-1 text-gray-400 text-sm">{t("subtitle")}</p>
        </div>
      </section>

      {showForm && (
        <section className="py-8 bg-white border-b border-gray-200">
          <div className="mx-auto max-w-2xl px-6">
            <h2 className="text-xl font-bold text-heading mb-4">{editingId ? t("editVideo") : t("newVideoHeading")}</h2>
            {formError && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{formError}</div>}
            <div className="space-y-4">
              <Field label={t("fields.title")} value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
              <Field
                label={t("fields.embedUrl")}
                value={form.embedUrl}
                onChange={(v) => setForm({ ...form, embedUrl: v })}
                placeholder="https://www.youtube.com/embed/VIDEO_ID"
              />
              <p className="text-xs text-gray-500 -mt-2">{t("embedUrlHint")}</p>
              {form.embedUrl && <VideoEmbed title={form.title || "preview"} embedUrl={form.embedUrl} />}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t("fields.category")} value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder={t("categoryPlaceholder")} />
                <Field label={t("fields.displayOrder")} type="number" value={String(form.displayOrder)} onChange={(v) => setForm({ ...form, displayOrder: Number(v) || 0 })} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t("fields.description")}</label>
                <textarea
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t("fields.relatedType")}</label>
                  <select value={form.relatedType} onChange={(e) => setForm({ ...form, relatedType: e.target.value, relatedId: "" })} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">{t("relatedTypeNone")}</option>
                    <option value="exhibition">{t("relatedTypeExhibition")}</option>
                    <option value="tour">{t("relatedTypeTour")}</option>
                  </select>
                </div>
                {form.relatedType && (
                  <Field label={t("fields.relatedId")} value={form.relatedId} onChange={(v) => setForm({ ...form, relatedId: v })} placeholder={t("relatedIdHint")} />
                )}
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <Button onClick={handleSave} disabled={saving} variant="gradientFlat" size="compact">
                {saving ? ta("saving") : editingId ? t("saveChanges") : t("createVideo")}
              </Button>
              <Button onClick={closeForm} variant="ghost" size="compact">{ta("cancel")}</Button>
            </div>
          </div>
        </section>
      )}

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-4xl px-6 space-y-4">
          {loading && <p className="text-gray-500 text-center py-10">{t("loadingVideos")}</p>}
          {error && <p className="text-red-600 text-center py-10">{error}</p>}
          {!loading && !error && videos.map((video) => (
            <Card key={video.id} shadow="sm" hoverable className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-heading truncate">{video.title}</h2>
                <p className="text-sm text-gray-500 truncate">{video.embedUrl}</p>
                {video.relatedType && <p className="text-xs text-gray-400 mt-1">{t("linkedTo", { type: video.relatedType, id: video.relatedId })}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => openEdit(video)} variant="ghost" size="xs">{t("editButton")}</Button>
                <Button onClick={() => handleDelete(video.id)} disabled={deletingId === video.id} variant="ghostDanger" size="xs">
                  {deletingId === video.id ? t("deleting") : ta("delete")}
                </Button>
              </div>
            </Card>
          ))}
          {!loading && !error && videos.length === 0 && (
            <p className="text-center text-gray-500 py-10">{t("noVideosYet")}</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );
}
