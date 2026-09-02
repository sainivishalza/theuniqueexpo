"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { slugify } from "@/lib/slugify";
import { readDocumentAsDataUrl } from "@/lib/client/image-upload";

interface Tour {
  id: string;
  slug: string;
  title: string;
  startDate: string;
  endDate: string;
  duration: string;
  departureCity: string;
  destination: string;
  description: string;
  highlights: string[];
  price: string;
  currency: string;
  groupSize: string;
  organizer: string;
  color: string;
  image: string;
  galleryImages: string[];
}

const MAX_GALLERY_IMAGES = 10;

const EMPTY_FORM = {
  slug: "", title: "", startDate: "", endDate: "", duration: "", departureCity: "", destination: "",
  description: "", highlights: "", price: "", currency: "USD", groupSize: "", organizer: "",
  color: "#0891b2", image: "", galleryImages: [] as string[],
};

export default function AdminToursPage() {
  const { user, loading: authLoading } = useAuth();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [galleryError, setGalleryError] = useState("");
  const [galleryUploading, setGalleryUploading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    void loadTours();
  }, [user]);

  async function loadTours() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/tours");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load tours");
      setTours(data.tours);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function openEdit(tour: Tour) {
    setForm({
      slug: tour.slug, title: tour.title, startDate: tour.startDate, endDate: tour.endDate,
      duration: tour.duration, departureCity: tour.departureCity, destination: tour.destination,
      description: tour.description, highlights: tour.highlights.join("\n"), price: tour.price,
      currency: tour.currency, groupSize: tour.groupSize, organizer: tour.organizer, color: tour.color,
      image: tour.image || "", galleryImages: [],
    });
    setFormError("");
    setEditingId(tour.id);
    setShowNew(false);
    setSlugTouched(true);

    // The list response points the image at the cacheable /image endpoint
    // instead of embedding raw base64 -- fetch the real value so saving
    // without touching the image doesn't overwrite the stored poster.
    try {
      const res = await fetch(`/api/tours/${tour.slug}`);
      const data = await res.json();
      if (res.ok && data.tour) {
        setForm((prev) =>
          prev.slug === tour.slug
            ? { ...prev, image: data.tour.image || "", galleryImages: data.tour.galleryImages || [] }
            : prev
        );
      }
    } catch {
      // Keep the lightweight URL as a fallback.
    }
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setFormError("");
    setShowNew(true);
    setEditingId(null);
    setSlugTouched(false);
  }

  function closeForm() {
    setEditingId(null);
    setShowNew(false);
  }

  async function handleSave() {
    if (!form.title || !form.slug || !form.startDate || !form.endDate) {
      setFormError("Title, slug, start date, and end date are required.");
      return;
    }
    setSaving(true);
    setFormError("");
    const payload = {
      ...form,
      highlights: form.highlights.split("\n").map((h) => h.trim()).filter(Boolean),
    };
    try {
      const url = editingId ? `/api/admin/tours/${editingId}` : "/api/admin/tours";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      closeForm();
      await loadTours();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleImageFile(file: File | null) {
    setImageError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setImageError("Image is too large. Please choose one under 8 MB.");
      return;
    }
    try {
      const dataUrl = await readDocumentAsDataUrl(file);
      setForm((prev) => ({ ...prev, image: dataUrl }));
    } catch {
      setImageError("Couldn't read that file. Please try again.");
    }
  }

  async function handleGalleryFiles(files: FileList | null) {
    setGalleryError("");
    if (!files || files.length === 0) return;
    const remaining = MAX_GALLERY_IMAGES - form.galleryImages.length;
    if (remaining <= 0) {
      setGalleryError(`You can add up to ${MAX_GALLERY_IMAGES} additional photos.`);
      return;
    }
    const picked = Array.from(files).slice(0, remaining);
    setGalleryUploading(true);
    try {
      const results: string[] = [];
      for (const file of picked) {
        if (!file.type.startsWith("image/")) {
          setGalleryError("Please choose image files only.");
          continue;
        }
        if (file.size > 8 * 1024 * 1024) {
          setGalleryError("One or more images were too large (over 8 MB) and were skipped.");
          continue;
        }
        try {
          results.push(await readDocumentAsDataUrl(file));
        } catch {
          setGalleryError("Couldn't read one of the files. Please try again.");
        }
      }
      if (results.length > 0) {
        setForm((prev) => ({ ...prev, galleryImages: [...prev.galleryImages, ...results] }));
      }
    } finally {
      setGalleryUploading(false);
    }
  }

  function removeGalleryImage(index: number) {
    setForm((prev) => ({ ...prev, galleryImages: prev.galleryImages.filter((_, i) => i !== index) }));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this tour? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/tours/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      setTours((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  if (authLoading) return null;

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-500">Access denied. Admin only.</p>
      </div>
    );
  }

  const showForm = showNew || editingId !== null;

  return (
    <div>
      <section className="bg-gray-900 py-8">
        <div className="mx-auto max-w-7xl px-6">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to admin
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-extrabold text-white">Tour Management</h1>
            <button
              onClick={openNew}
              className="rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
            >
              + New Tour
            </button>
          </div>
        </div>
      </section>

      {showForm && (
        <section className="py-8 bg-white border-b border-gray-200">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{editingId ? "Edit Tour" : "New Tour"}</h2>
            {formError && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{formError}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Title"
                value={form.title}
                onChange={(v) => setForm((f) => ({ ...f, title: v, slug: slugTouched ? f.slug : slugify(v) }))}
              />
              <Field
                label="Slug"
                value={form.slug}
                onChange={(v) => {
                  setSlugTouched(true);
                  setForm((f) => ({ ...f, slug: v }));
                }}
                placeholder="my-tour-2026"
              />
              <Field label="Start Date" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
              <Field label="End Date" type="date" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} />
              <Field label="Duration" value={form.duration} onChange={(v) => setForm({ ...form, duration: v })} placeholder="3 days / 2 nights" />
              <Field label="Departure City" value={form.departureCity} onChange={(v) => setForm({ ...form, departureCity: v })} />
              <Field label="Destination" value={form.destination} onChange={(v) => setForm({ ...form, destination: v })} />
              <Field label="Price (per person)" value={form.price} onChange={(v) => setForm({ ...form, price: v })} placeholder="220" />
              <Field label="Currency" value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} placeholder="USD" />
              <Field label="Group Size" value={form.groupSize} onChange={(v) => setForm({ ...form, groupSize: v })} placeholder="10-25 travelers" />
              <Field label="Organizer" value={form.organizer} onChange={(v) => setForm({ ...form, organizer: v })} />
              <Field label="Accent Color" type="color" value={form.color} onChange={(v) => setForm({ ...form, color: v })} />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Hero Image</label>
              <p className="text-xs text-gray-500 mb-2">Paste an image URL, or upload your own photo below — whichever you set last is used.</p>
              <div className="flex gap-4 items-start">
                <div className="relative w-32 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-900 border border-gray-200">
                  {form.image && (
                    <>
                      <img src={form.image} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover blur-md scale-110 opacity-60" />
                      <img src={form.image} alt="Preview" className="absolute inset-0 w-full h-full object-contain" />
                    </>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={form.image.startsWith("data:") ? "" : form.image}
                    placeholder={form.image.startsWith("data:") ? "Uploaded image set — paste a URL to replace it" : "https://..."}
                    onChange={(e) => setForm({ ...form, image: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                      Upload photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    {form.image && (
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, image: "" }))}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Remove image
                      </button>
                    )}
                  </div>
                  {imageError && <p className="text-xs text-red-600">{imageError}</p>}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Additional Photos</label>
              <p className="text-xs text-gray-500 mb-2">Shown as a gallery on the tour's own page, below the hero image above. Up to {MAX_GALLERY_IMAGES} photos.</p>
              {form.galleryImages.length > 0 && (
                <div className="mb-3 grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {form.galleryImages.map((img, i) => (
                    <div key={i} className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 border border-gray-200 group">
                      <img src={img} alt={`Gallery photo ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(i)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Remove photo ${i + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {form.galleryImages.length < MAX_GALLERY_IMAGES && (
                <label className="cursor-pointer inline-block rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                  {galleryUploading ? "Uploading..." : "Add photos"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={galleryUploading}
                    onChange={(e) => {
                      void handleGalleryFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
              {galleryError && <p className="mt-1 text-xs text-red-600">{galleryError}</p>}
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Highlights (one per line)</label>
              <textarea
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={4}
                value={form.highlights}
                onChange={(e) => setForm({ ...form, highlights: e.target.value })}
              />
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Tour"}
              </button>
              <button
                onClick={closeForm}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 space-y-4">
          {loading && <p className="text-gray-500 text-center py-10">Loading tours...</p>}
          {error && <p className="text-red-600 text-center py-10">{error}</p>}
          {!loading && !error && tours.map((tour) => (
            <div key={tour.id} className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl bg-white p-5 shadow-sm border border-gray-100 card-hover">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-20 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                  {tour.image && <img src={tour.image} alt={tour.title} className="img-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-gray-900 truncate">{tour.title}</h2>
                  <p className="text-sm text-gray-500">{tour.startDate} → {tour.endDate} • {tour.departureCity} → {tour.destination} • {tour.currency}{tour.price}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/tours/${tour.slug}`} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">View</Link>
                <Link href={`/admin/tours/${tour.slug}/registrations`} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Registrations</Link>
                <Link href={`/admin/tours/${tour.slug}/registration-form`} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Registration Form</Link>
                <button onClick={() => openEdit(tour)} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Edit</button>
                <button
                  onClick={() => handleDelete(tour.id)}
                  disabled={deletingId === tour.id}
                  className="rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deletingId === tour.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
          {!loading && !error && tours.length === 0 && (
            <p className="text-center text-gray-500 py-10">No tours yet. Create one to get started.</p>
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
