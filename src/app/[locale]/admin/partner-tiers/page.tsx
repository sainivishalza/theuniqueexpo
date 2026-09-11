"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@/i18n/navigation";
import { errorMessage } from "@/lib/format";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

interface PartnerTier {
  id: string;
  name: string;
  tagline: string;
  priceLabel: string;
  commissionRate: string;
  benefits: string[];
  badgeTone: string;
  displayOrder: number;
}

const BADGE_TONES = ["gray", "gold", "emerald", "purple"];

const EMPTY_FORM = { name: "", tagline: "", priceLabel: "", commissionRate: "", benefits: "", badgeTone: "gray", displayOrder: 0 };

export default function AdminPartnerTiersPage() {
  const t = useTranslations("adminPartnerTiers");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [tiers, setTiers] = useState<PartnerTier[]>([]);
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
    void loadTiers();
  }, [user]);

  async function loadTiers() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/partner-tiers");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("loadFailed"));
      setTiers(data.tiers);
    } catch (err) {
      setError(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setLoading(false);
    }
  }

  function openEdit(tier: PartnerTier) {
    setForm({
      name: tier.name,
      tagline: tier.tagline,
      priceLabel: tier.priceLabel,
      commissionRate: tier.commissionRate,
      benefits: tier.benefits.join("\n"),
      badgeTone: tier.badgeTone,
      displayOrder: tier.displayOrder,
    });
    setFormError("");
    setEditingId(tier.id);
    setShowNew(false);
  }

  function openNew() {
    setForm({ ...EMPTY_FORM, displayOrder: tiers.length });
    setFormError("");
    setShowNew(true);
    setEditingId(null);
  }

  function closeForm() {
    setEditingId(null);
    setShowNew(false);
  }

  async function handleSave() {
    if (!form.name || !form.tagline || !form.priceLabel) {
      setFormError(t("requiredFieldsError"));
      return;
    }
    setSaving(true);
    setFormError("");
    const payload = {
      ...form,
      benefits: form.benefits.split("\n").map((b) => b.trim()).filter(Boolean),
    };
    try {
      const url = editingId ? `/api/admin/partner-tiers/${editingId}` : "/api/admin/partner-tiers";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("saveFailed"));
      closeForm();
      await loadTiers();
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
      const res = await fetch(`/api/admin/partner-tiers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("deleteFailed"));
      }
      setTiers((prev) => prev.filter((t) => t.id !== id));
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
              {t("newTier")}
            </Button>
          </div>
          <p className="mt-1 text-gray-400 text-sm">
            {t("subtitle")} <Link href="/admin/partner-applications" className="text-emerald-300 hover:underline">{t("viewApplications")}</Link>
          </p>
        </div>
      </section>

      {showForm && (
        <section className="py-8 bg-white border-b border-gray-200">
          <div className="mx-auto max-w-2xl px-6">
            <h2 className="text-xl font-bold text-heading mb-4">{editingId ? t("editTier") : t("newTierHeading")}</h2>
            {formError && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{formError}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t("fields.name")} value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label={t("fields.priceLabel")} value={form.priceLabel} onChange={(v) => setForm({ ...form, priceLabel: v })} placeholder="Free / Apply to join / Custom terms" />
            </div>
            <div className="mt-4">
              <Field label={t("fields.tagline")} value={form.tagline} onChange={(v) => setForm({ ...form, tagline: v })} />
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t("fields.commissionRate")} value={form.commissionRate} onChange={(v) => setForm({ ...form, commissionRate: v })} />
              <Field label={t("fields.displayOrder")} type="number" value={String(form.displayOrder)} onChange={(v) => setForm({ ...form, displayOrder: Number(v) || 0 })} />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("fields.badgeTone")}</label>
              <div className="flex flex-wrap gap-2">
                {BADGE_TONES.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => setForm({ ...form, badgeTone: tone })}
                    className={`rounded-full px-3 py-1 ${form.badgeTone === tone ? "ring-2 ring-emerald-500" : ""}`}
                  >
                    <Badge tone={tone as "gray" | "gold" | "emerald" | "purple"} size="tag">{tone}</Badge>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("fields.benefits")}</label>
              <p className="text-xs text-gray-500 mb-2">{t("benefitsHint")}</p>
              <textarea
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={6}
                value={form.benefits}
                onChange={(e) => setForm({ ...form, benefits: e.target.value })}
              />
            </div>
            <div className="mt-5 flex gap-3">
              <Button onClick={handleSave} disabled={saving} variant="gradientFlat" size="compact">
                {saving ? ta("saving") : editingId ? t("saveChanges") : t("createTier")}
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
          {loading && <p className="text-gray-500 text-center py-10">{t("loadingTiers")}</p>}
          {error && <p className="text-red-600 text-center py-10">{error}</p>}
          {!loading && !error && tiers.map((tier) => (
            <Card key={tier.id} shadow="sm" hoverable className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge tone={tier.badgeTone as "gray" | "gold" | "emerald" | "purple"} size="tag">{tier.name}</Badge>
                    <span className="text-sm font-semibold text-heading">{tier.priceLabel}</span>
                  </div>
                  <p className="text-sm text-gray-500">{tier.tagline}</p>
                  <p className="text-xs text-gray-400 mt-1">{tier.commissionRate} &middot; {tier.benefits.length} {t("benefitsCount")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => openEdit(tier)} variant="ghost" size="xs">{t("editButton")}</Button>
                  <Button onClick={() => handleDelete(tier.id)} disabled={deletingId === tier.id} variant="ghostDanger" size="xs">
                    {deletingId === tier.id ? t("deleting") : ta("delete")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {!loading && !error && tiers.length === 0 && (
            <p className="text-center text-gray-500 py-10">{t("noTiersYet")}</p>
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
