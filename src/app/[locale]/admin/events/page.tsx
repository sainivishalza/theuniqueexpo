"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@/i18n/navigation";
import { slugify } from "@/lib/slugify";
import { errorMessage } from "@/lib/format";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface Event {
  id: string;
  slug: string;
  title: string;
  category: string;
  city: string;
  venue: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  price: string;
  capacity: number;
  description: string;
  image: string;
  registrationEnabled: boolean;
}

const CATEGORIES = ["networking", "hiking", "picnic", "cultural", "other"];

const EMPTY_FORM = {
  slug: "", title: "", category: "networking", city: "", venue: "", eventDate: "",
  startTime: "", endTime: "", price: "", capacity: 0, description: "", image: "",
};

export default function AdminEventsPage() {
  const t = useTranslations("adminEventsCrud");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    void loadEvents();
  }, [user]);

  async function loadEvents() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("loadFailed"));
      setEvents(data.events);
    } catch (err) {
      setError(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setLoading(false);
    }
  }

  function openEdit(event: Event) {
    setForm({
      slug: event.slug, title: event.title, category: event.category, city: event.city,
      venue: event.venue, eventDate: event.eventDate, startTime: event.startTime, endTime: event.endTime,
      price: event.price, capacity: event.capacity, description: event.description, image: event.image || "",
    });
    setFormError("");
    setEditingId(event.id);
    setShowNew(false);
    setSlugTouched(true);
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
    if (!form.title || !form.slug || !form.eventDate) {
      setFormError(t("requiredFieldsError"));
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const url = editingId ? `/api/admin/events/${editingId}` : "/api/admin/events";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("saveFailed"));
      closeForm();
      await loadEvents();
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
      const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("deleteFailed"));
      }
      setEvents((prev) => prev.filter((e) => e.id !== id));
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
        <div className="mx-auto max-w-7xl px-6">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            {ta("backToAdmin")}
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
            <Button onClick={openNew} variant="gradientCta" size="compact">
              {t("newEvent")}
            </Button>
          </div>
        </div>
      </section>

      {showForm && (
        <section className="py-8 bg-white border-b border-gray-200">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-xl font-bold text-heading mb-4">{editingId ? t("editEvent") : t("newEventHeading")}</h2>
            {formError && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{formError}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label={t("fields.title")}
                value={form.title}
                onChange={(v) => setForm((f) => ({ ...f, title: v, slug: slugTouched ? f.slug : slugify(v) }))}
              />
              <Field
                label={t("fields.slug")}
                value={form.slug}
                onChange={(v) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: v })); }}
                placeholder="guangzhou-hiking-meetup"
              />
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t("fields.category")}</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{t(`categories.${c}`)}</option>)}
                </select>
              </div>
              <Field label={t("fields.city")} value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <Field label={t("fields.venue")} value={form.venue} onChange={(v) => setForm({ ...form, venue: v })} />
              <Field label={t("fields.eventDate")} type="date" value={form.eventDate} onChange={(v) => setForm({ ...form, eventDate: v })} />
              <Field label={t("fields.startTime")} value={form.startTime} onChange={(v) => setForm({ ...form, startTime: v })} placeholder="10:00 AM" />
              <Field label={t("fields.endTime")} value={form.endTime} onChange={(v) => setForm({ ...form, endTime: v })} placeholder="2:00 PM" />
              <Field label={t("fields.price")} value={form.price} onChange={(v) => setForm({ ...form, price: v })} placeholder={t("fields.pricePlaceholder")} />
              <Field label={t("fields.capacity")} type="number" value={String(form.capacity)} onChange={(v) => setForm({ ...form, capacity: Number(v) || 0 })} />
              <Field label={t("fields.imageUrl")} value={form.image} onChange={(v) => setForm({ ...form, image: v })} placeholder="https://..." />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("fields.description")}</label>
              <textarea
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="mt-5 flex gap-3">
              <Button onClick={handleSave} disabled={saving} variant="gradientFlat" size="compact">
                {saving ? ta("saving") : editingId ? t("saveChanges") : t("createEvent")}
              </Button>
              <Button onClick={closeForm} variant="ghost" size="compact">
                {ta("cancel")}
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-7xl px-6 space-y-4">
          {loading && <p className="text-gray-500 text-center py-10">{t("loadingEvents")}</p>}
          {error && <p className="text-red-600 text-center py-10">{error}</p>}
          {!loading && !error && events.map((event) => (
            <Card key={event.id} shadow="sm" hoverable className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-heading truncate">{event.title}</h2>
                <p className="text-sm text-gray-500">
                  {event.eventDate} · {t(`categories.${event.category}`)}{event.city ? ` · ${event.city}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button href={`/events/${event.slug}`} variant="ghost" size="xs">{t("view")}</Button>
                <Button href={`/admin/events/${event.slug}/registrations`} variant="ghost" size="xs">{t("registrations")}</Button>
                <Button onClick={() => openEdit(event)} variant="ghost" size="xs">{t("editButton")}</Button>
                <Button onClick={() => handleDelete(event.id)} disabled={deletingId === event.id} variant="ghostDanger" size="xs">
                  {deletingId === event.id ? t("deleting") : ta("delete")}
                </Button>
              </div>
            </Card>
          ))}
          {!loading && !error && events.length === 0 && (
            <p className="text-center text-gray-500 py-10">{t("noEventsYet")}</p>
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
