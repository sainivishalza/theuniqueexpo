"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@/i18n/navigation";
import { readDocumentAsDataUrl } from "@/lib/client/image-upload";
import { errorMessage } from "@/lib/format";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  photo: string;
  displayOrder: number;
}

const EMPTY_FORM = { name: "", role: "", photo: "", displayOrder: 0 };

export default function AdminTeamPage() {
  const t = useTranslations("adminTeam");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    void loadMembers();
  }, [user]);

  async function loadMembers() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/team-members");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("loadFailed"));
      setMembers(data.teamMembers);
    } catch (err) {
      setError(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setLoading(false);
    }
  }

  async function openEdit(member: TeamMember) {
    setForm({ name: member.name, role: member.role, photo: member.photo || "", displayOrder: member.displayOrder });
    setFormError("");
    setPhotoError("");
    setEditingId(member.id);
    setShowNew(false);

    // The list response points the photo at the cacheable /photo endpoint
    // instead of embedding the raw base64 -- fetch the real bytes so saving
    // without touching the photo doesn't overwrite it with just that URL.
    if (member.photo?.startsWith("/api/team-members/")) {
      try {
        const blob = await (await fetch(member.photo)).blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        setForm((prev) => (prev.name === member.name && prev.role === member.role ? { ...prev, photo: dataUrl } : prev));
      } catch {
        // Keep the lightweight URL as a fallback.
      }
    }
  }

  function openNew() {
    setForm({ ...EMPTY_FORM, displayOrder: members.length });
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
    if (!form.name || !form.role) {
      setFormError(t("requiredFieldsError"));
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const url = editingId ? `/api/admin/team-members/${editingId}` : "/api/admin/team-members";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("saveFailed"));
      closeForm();
      await loadMembers();
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
      setForm((prev) => ({ ...prev, photo: dataUrl }));
    } catch {
      setPhotoError(t("couldNotReadFile"));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("confirmDelete"))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/team-members/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("deleteFailed"));
      }
      setMembers((prev) => prev.filter((m) => m.id !== id));
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
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
            <Button onClick={openNew} variant="gradientCta" size="compact">
              {t("newMember")}
            </Button>
          </div>
          <p className="mt-1 text-gray-400 text-sm">{t("subtitle")}</p>
        </div>
      </section>

      {showForm && (
        <section className="py-8 bg-white border-b border-gray-200">
          <div className="mx-auto max-w-2xl px-6">
            <h2 className="text-xl font-bold text-heading mb-4">{editingId ? t("editMember") : t("newMemberHeading")}</h2>
            {formError && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{formError}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t("fields.name")} value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label={t("fields.role")} value={form.role} onChange={(v) => setForm({ ...form, role: v })} />
              <Field
                label={t("fields.displayOrder")}
                type="number"
                value={String(form.displayOrder)}
                onChange={(v) => setForm({ ...form, displayOrder: Number(v) || 0 })}
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("photo")}</label>
              <div className="flex gap-4 items-start">
                <div className="relative w-24 h-24 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
                  {form.photo && <img src={form.photo} alt={ta("preview")} className="absolute inset-0 w-full h-full object-cover" />}
                </div>
                <div className="flex-1 space-y-2">
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
                    {form.photo && (
                      <Button type="button" onClick={() => setForm((prev) => ({ ...prev, photo: "" }))} variant="linkDanger" size="inline">
                        {t("removePhoto")}
                      </Button>
                    )}
                  </div>
                  {photoError && <p className="text-xs text-red-600">{photoError}</p>}
                </div>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <Button onClick={handleSave} disabled={saving} variant="gradientFlat" size="compact">
                {saving ? ta("saving") : editingId ? t("saveChanges") : t("createMember")}
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
          {loading && <p className="text-gray-500 text-center py-10">{t("loadingMembers")}</p>}
          {error && <p className="text-red-600 text-center py-10">{error}</p>}
          {!loading && !error && members.map((member) => (
            <Card key={member.id} shadow="sm" hoverable className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                  {member.photo && <img src={member.photo} alt={member.name} className="img-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-heading truncate">{member.name}</h2>
                  <p className="text-sm text-gray-500">{member.role}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => openEdit(member)} variant="ghost" size="xs">{t("editButton")}</Button>
                <Button onClick={() => handleDelete(member.id)} disabled={deletingId === member.id} variant="ghostDanger" size="xs">
                  {deletingId === member.id ? t("deleting") : ta("delete")}
                </Button>
              </div>
            </Card>
          ))}
          {!loading && !error && members.length === 0 && (
            <p className="text-center text-gray-500 py-10">{t("noMembersYet")}</p>
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
