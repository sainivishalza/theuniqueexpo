"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

interface Exhibition {
  id: string;
  slug: string;
  title: string;
  startDate: string;
  endDate: string;
  venue: string;
  city: string;
  country: string;
  industry: string;
  description: string;
  highlights: string[];
  exhibitors: number;
  visitors: string;
  organizer: string;
  website: string;
  color: string;
  image: string;
}

const EMPTY_FORM = {
  slug: "", title: "", startDate: "", endDate: "", venue: "", city: "", country: "",
  industry: "", description: "", highlights: "", exhibitors: 0, visitors: "", organizer: "",
  website: "", color: "#059669", image: "",
};

export default function AdminExhibitionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    void loadExhibitions();
  }, [user]);

  async function loadExhibitions() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/exhibitions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load exhibitions");
      setExhibitions(data.exhibitions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function openEdit(expo: Exhibition) {
    setForm({
      slug: expo.slug, title: expo.title, startDate: expo.startDate, endDate: expo.endDate,
      venue: expo.venue, city: expo.city, country: expo.country, industry: expo.industry,
      description: expo.description, highlights: expo.highlights.join("\n"), exhibitors: expo.exhibitors,
      visitors: expo.visitors, organizer: expo.organizer, website: expo.website, color: expo.color,
      image: expo.image || "",
    });
    setFormError("");
    setEditingId(expo.id);
    setShowNew(false);

    // The list response points the image at the cacheable /image endpoint
    // instead of embedding the raw base64 (see listExhibitions) -- fetch
    // the real value so saving without touching the image doesn't
    // overwrite the stored poster with just that URL.
    try {
      const res = await fetch(`/api/exhibitions/${expo.slug}`);
      const data = await res.json();
      if (res.ok && data.exhibition) {
        setForm((prev) => (prev.slug === expo.slug ? { ...prev, image: data.exhibition.image || "" } : prev));
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
      exhibitors: Number(form.exhibitors) || 0,
      highlights: form.highlights.split("\n").map((h) => h.trim()).filter(Boolean),
    };
    try {
      const url = editingId ? `/api/admin/exhibitions/${editingId}` : "/api/admin/exhibitions";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      closeForm();
      await loadExhibitions();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleImageFile(file: File | null) {
    setImageError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Please choose an image file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setImageError("Image is too large. Please choose one under 4 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, image: reader.result as string }));
    reader.onerror = () => setImageError("Couldn't read that file. Please try again.");
    reader.readAsDataURL(file);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this exhibition? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/exhibitions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      setExhibitions((prev) => prev.filter((e) => e.id !== id));
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
            <h1 className="text-3xl font-extrabold text-white">Exhibition Management</h1>
            <button
              onClick={openNew}
              className="rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
            >
              + New Exhibition
            </button>
          </div>
        </div>
      </section>

      {showForm && (
        <section className="py-8 bg-white border-b border-gray-200">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{editingId ? "Edit Exhibition" : "New Exhibition"}</h2>
            {formError && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{formError}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
              <Field label="Slug" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="my-exhibition-2026" />
              <Field label="Start Date" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
              <Field label="End Date" type="date" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} />
              <Field label="Venue" value={form.venue} onChange={(v) => setForm({ ...form, venue: v })} />
              <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
              <Field label="Industry" value={form.industry} onChange={(v) => setForm({ ...form, industry: v })} />
              <Field label="Exhibitors (count)" type="number" value={String(form.exhibitors)} onChange={(v) => setForm({ ...form, exhibitors: Number(v) })} />
              <Field label="Visitors" value={form.visitors} onChange={(v) => setForm({ ...form, visitors: v })} placeholder="30,000+" />
              <Field label="Organizer" value={form.organizer} onChange={(v) => setForm({ ...form, organizer: v })} />
              <Field label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
              <Field label="Accent Color" type="color" value={form.color} onChange={(v) => setForm({ ...form, color: v })} />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Hero Image</label>
              <p className="text-xs text-gray-500 mb-2">Paste an image URL, or upload your own poster below — whichever you set last is used.</p>
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
                      Upload poster image
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
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={3}
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
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Exhibition"}
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
          {loading && <p className="text-gray-500 text-center py-10">Loading exhibitions...</p>}
          {error && <p className="text-red-600 text-center py-10">{error}</p>}
          {!loading && !error && exhibitions.map((expo) => (
            <div key={expo.id} className="flex items-center gap-5 rounded-2xl bg-white p-5 shadow-sm border border-gray-100 card-hover">
              <div className="w-20 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                {expo.image && <img src={expo.image} alt={expo.title} className="img-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-gray-900 truncate">{expo.title}</h2>
                <p className="text-sm text-gray-500">{expo.startDate} → {expo.endDate} • {expo.city} • {expo.exhibitors} exhibitors</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/exhibitions/${expo.slug}`} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">View</Link>
                <Link href={`/admin/exhibitions/${expo.slug}/registrations`} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Registrations</Link>
                <Link href={`/admin/exhibitions/${expo.slug}/registration-form`} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Registration Form</Link>
                <button onClick={() => openEdit(expo)} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Edit</button>
                <button
                  onClick={() => handleDelete(expo.id)}
                  disabled={deletingId === expo.id}
                  className="rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deletingId === expo.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
          {!loading && !error && exhibitions.length === 0 && (
            <p className="text-center text-gray-500 py-10">No exhibitions yet. Create one to get started.</p>
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
