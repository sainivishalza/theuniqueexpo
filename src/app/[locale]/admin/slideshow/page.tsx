"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@/i18n/navigation";
import { readDocumentAsDataUrl } from "@/lib/client/image-upload";
import { errorMessage } from "@/lib/format";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface SlideshowPhoto {
  id: string;
  image: string;
  caption: string;
  displayOrder: number;
}

const EMPTY_FORM = { image: "", caption: "", displayOrder: 0 };

export default function AdminSlideshowPage() {
  const t = useTranslations("adminSlideshow");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [photos, setPhotos] = useState<SlideshowPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [bulkError, setBulkError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    void loadPhotos();
  }, [user]);

  async function loadPhotos() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/slideshow-photos");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("loadFailed"));
      setPhotos(data.photos);
    } catch (err) {
      setError(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setLoading(false);
    }
  }

  async function openEdit(photo: SlideshowPhoto) {
    setForm({ image: photo.image || "", caption: photo.caption, displayOrder: photo.displayOrder });
    setFormError("");
    setPhotoError("");
    setEditingId(photo.id);
    setShowNew(false);

    // The list response points the image at the cacheable /image endpoint
    // instead of embedding the raw base64 -- fetch the real bytes so saving
    // without touching the photo doesn't overwrite it with just that URL.
    if (photo.image?.startsWith("/api/slideshow-photos/")) {
      try {
        const blob = await (await fetch(photo.image)).blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        setForm((prev) => (prev.caption === photo.caption ? { ...prev, image: dataUrl } : prev));
      } catch {
        // Keep the lightweight URL as a fallback.
      }
    }
  }

  function openNew() {
    setForm({ ...EMPTY_FORM, displayOrder: photos.length });
    setFormError("");
    setPhotoError("");
    setShowNew(true);
    setEditingId(null);
  }

  function closeForm() {
    setEditingId(null);
    setShowNew(false);
  }

  async function handleSave() {
    if (!form.image) {
      setFormError(t("photoRequiredError"));
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const url = editingId ? `/api/admin/slideshow-photos/${editingId}` : "/api/admin/slideshow-photos";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("saveFailed"));
      closeForm();
      await loadPhotos();
    } catch (err) {
      setFormError(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoFile(file: File | null) {
    setPhotoError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError(t("choosePhotoFile"));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setPhotoError(t("photoTooLarge"));
      return;
    }
    try {
      const dataUrl = await readDocumentAsDataUrl(file);
      setForm((prev) => ({ ...prev, image: dataUrl }));
    } catch {
      setPhotoError(t("couldNotReadFile"));
    }
  }

  // Uploads any number of files in one go, one at a time (each is its own
  // full row/POST -- keeping them sequential rather than parallel avoids
  // firing a burst of large base64 payloads at the server at once), each
  // landing after the current last photo in display order.
  async function handleBulkUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBulkError("");
    const fileList = Array.from(files);
    setBulkProgress({ done: 0, total: fileList.length });
    let nextOrder = photos.length;
    const failures: string[] = [];

    for (const file of fileList) {
      if (!file.type.startsWith("image/")) {
        failures.push(`${file.name}: ${t("choosePhotoFile")}`);
      } else if (file.size > 8 * 1024 * 1024) {
        failures.push(`${file.name}: ${t("photoTooLarge")}`);
      } else {
        try {
          const dataUrl = await readDocumentAsDataUrl(file);
          const res = await fetch("/api/admin/slideshow-photos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: dataUrl, caption: "", displayOrder: nextOrder }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            failures.push(`${file.name}: ${data.error || t("saveFailed")}`);
          } else {
            nextOrder += 1;
          }
        } catch {
          failures.push(`${file.name}: ${t("couldNotReadFile")}`);
        }
      }
      setBulkProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev));
    }

    if (failures.length > 0) setBulkError(failures.join("; "));
    setBulkProgress(null);
    await loadPhotos();
  }

  async function handleDelete(id: string) {
    if (!confirm(t("confirmDelete"))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/slideshow-photos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("deleteFailed"));
      }
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setDeletingId(null);
    }
  }

  if (authLoading) return null;

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-500">{t("accessDenied")}</p>
      </div>
    );
  }

  const showForm = showNew || editingId !== null;

  return (
    <div>
      <section className="bg-[var(--color-hero-bg)] py-8">
        <div className="mx-auto max-w-5xl px-6">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            {t("backToAdmin")}
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer rounded-full px-5 py-2.5 text-sm border-2 border-white/30 text-white backdrop-blur-sm hover:bg-white/10 transition-colors">
                {t("bulkUpload")}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={bulkProgress !== null}
                  onChange={(e) => {
                    void handleBulkUpload(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              <Button onClick={openNew} variant="gradientCta" size="compact">
                {t("newPhoto")}
              </Button>
            </div>
          </div>
          <p className="mt-1 text-gray-400 text-sm">{t("subtitle")}</p>
          {bulkProgress && (
            <p className="mt-2 text-sm text-emerald-300">{t("bulkUploadProgress", { done: bulkProgress.done, total: bulkProgress.total })}</p>
          )}
          {bulkError && <p className="mt-2 text-sm text-red-400">{bulkError}</p>}
        </div>
      </section>

      {showForm && (
        <section className="py-8 bg-white border-b border-gray-200">
          <div className="mx-auto max-w-2xl px-6">
            <h2 className="text-xl font-bold text-heading mb-4">{editingId ? t("editPhoto") : t("newPhotoHeading")}</h2>
            {formError && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{formError}</div>}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("photo")}</label>
              <div className="space-y-2">
                <div className="relative w-full aspect-[16/7] max-h-56 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                  {form.image && <img src={form.image} alt={ta("preview")} className="absolute inset-0 w-full h-full object-cover" />}
                </div>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-cream-50 transition-colors">
                    {t("uploadPhoto")}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  {form.image && (
                    <Button type="button" onClick={() => setForm((prev) => ({ ...prev, image: "" }))} variant="linkDanger" size="inline">
                      {t("removePhoto")}
                    </Button>
                  )}
                </div>
                {photoError && <p className="text-xs text-red-600">{photoError}</p>}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t("fields.caption")} value={form.caption} onChange={(v) => setForm({ ...form, caption: v })} />
              <Field
                label={t("fields.displayOrder")}
                type="number"
                value={String(form.displayOrder)}
                onChange={(v) => setForm({ ...form, displayOrder: Number(v) || 0 })}
              />
            </div>

            <div className="mt-5 flex gap-3">
              <Button onClick={handleSave} disabled={saving} variant="gradientFlat" size="compact">
                {saving ? ta("saving") : editingId ? t("saveChanges") : t("createPhoto")}
              </Button>
              <Button onClick={closeForm} variant="ghost" size="compact">
                {ta("cancel")}
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-5xl px-6 space-y-4">
          <p className="text-sm text-gray-500">{t("orderHint")}</p>
          {loading && <p className="text-gray-500 text-center py-10">{t("loadingPhotos")}</p>}
          {error && <p className="text-red-600 text-center py-10">{error}</p>}
          {!loading && !error && photos.map((photo) => (
            <Card key={photo.id} shadow="sm" hoverable className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-28 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  {photo.image && <img src={photo.image} alt={photo.caption || ""} className="img-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-heading truncate">{photo.caption || t("noCaption")}</h2>
                  <p className="text-sm text-gray-500">{t("orderLabel", { order: photo.displayOrder })}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => openEdit(photo)} variant="ghost" size="xs">{t("editButton")}</Button>
                <Button onClick={() => handleDelete(photo.id)} disabled={deletingId === photo.id} variant="ghostDanger" size="xs">
                  {deletingId === photo.id ? t("deleting") : ta("delete")}
                </Button>
              </div>
            </Card>
          ))}
          {!loading && !error && photos.length === 0 && (
            <p className="text-center text-gray-500 py-10">{t("noPhotosYet")}</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );
}
