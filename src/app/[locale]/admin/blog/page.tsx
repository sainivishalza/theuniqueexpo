"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@/i18n/navigation";
import { slugify } from "@/lib/slugify";
import { errorMessage } from "@/lib/format";
import type { FaqItem } from "@/lib/faq-content";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";

interface Post {
  id: string;
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  authorName: string;
  authorBio: string;
  faqItems: FaqItem[];
  published: boolean;
}

const CATEGORIES = ["life-in-china", "relocation-tips", "exhibition-reviews"];

const EMPTY_FORM = {
  slug: "", category: "life-in-china", title: "", excerpt: "", content: "", coverImage: "",
  authorName: "", authorBio: "", faqItems: [] as FaqItem[], published: false,
};

export default function AdminBlogPage() {
  const t = useTranslations("adminBlogCrud");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
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
    void loadPosts();
  }, [user]);

  async function loadPosts() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/blog");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("loadFailed"));
      setPosts(data.posts);
    } catch (err) {
      setError(errorMessage(err, "Something went wrong"));
    } finally {
      setLoading(false);
    }
  }

  function openEdit(post: Post) {
    setForm({
      slug: post.slug, category: post.category, title: post.title, excerpt: post.excerpt,
      content: post.content, coverImage: post.coverImage || "",
      authorName: post.authorName || "", authorBio: post.authorBio || "",
      faqItems: post.faqItems || [], published: post.published,
    });
    setFormError("");
    setEditingId(post.id);
    setShowNew(false);
    setSlugTouched(true);
  }

  function updateFaqItem(index: number, patch: Partial<FaqItem>) {
    setForm((f) => ({ ...f, faqItems: f.faqItems.map((item, i) => (i === index ? { ...item, ...patch } : item)) }));
  }

  function addFaqItem() {
    setForm((f) => ({ ...f, faqItems: [...f.faqItems, { question: "", answer: "" }] }));
  }

  function removeFaqItem(index: number) {
    setForm((f) => ({ ...f, faqItems: f.faqItems.filter((_, i) => i !== index) }));
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
    if (!form.title || !form.slug || !form.content) {
      setFormError(t("requiredFieldsError"));
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const url = editingId ? `/api/admin/blog/${editingId}` : "/api/admin/blog";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("saveFailed"));
      closeForm();
      await loadPosts();
    } catch (err) {
      setFormError(errorMessage(err, "Something went wrong"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("confirmDelete"))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("deleteFailed"));
      }
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(errorMessage(err, "Something went wrong"));
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
              {t("newPost")}
            </Button>
          </div>
        </div>
      </section>

      {showForm && (
        <section className="py-8 bg-white border-b border-gray-200">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-xl font-bold text-heading mb-4">{editingId ? t("editPost") : t("newPostHeading")}</h2>
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
                placeholder="life-in-guangzhou-first-month"
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
              <Field label={t("fields.coverImageUrl")} value={form.coverImage} onChange={(v) => setForm({ ...form, coverImage: v })} placeholder="https://..." />
              <Field label={t("fields.authorName")} value={form.authorName} onChange={(v) => setForm({ ...form, authorName: v })} placeholder="Vishal Saini" />
              <Field label={t("fields.authorBio")} value={form.authorBio} onChange={(v) => setForm({ ...form, authorBio: v })} placeholder={t("fields.authorBioPlaceholder")} />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("fields.excerpt")}</label>
              <textarea
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={2}
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                placeholder={t("fields.excerptPlaceholder")}
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("fields.content")}</label>
              <p className="text-xs text-gray-400 mb-1">{t("fields.contentHint")}</p>
              <textarea
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={14}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("fields.faqItems")}</label>
              <p className="text-xs text-gray-400 mb-2">{t("fields.faqItemsHint")}</p>
              <div className="space-y-2">
                {form.faqItems.map((item, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <input
                        type="text"
                        value={item.question}
                        onChange={(e) => updateFaqItem(i, { question: e.target.value })}
                        placeholder={t("fields.faqQuestionPlaceholder")}
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold"
                      />
                      <Button onClick={() => removeFaqItem(i)} variant="linkDanger" size="inline" className="whitespace-nowrap py-2">{ta("delete")}</Button>
                    </div>
                    <textarea
                      value={item.answer}
                      onChange={(e) => updateFaqItem(i, { answer: e.target.value })}
                      placeholder={t("fields.faqAnswerPlaceholder")}
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y"
                    />
                  </div>
                ))}
                <Button onClick={addFaqItem} variant="dashedAdd" size="blockSm">
                  {t("fields.addFaqItem")}
                </Button>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="published"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="published" className="text-sm font-medium text-gray-700">{t("fields.published")}</label>
            </div>
            <div className="mt-5 flex gap-3">
              <Button onClick={handleSave} disabled={saving} variant="gradientFlat" size="compact">
                {saving ? ta("saving") : editingId ? t("saveChanges") : t("createPost")}
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
          {loading && <p className="text-gray-500 text-center py-10">{t("loadingPosts")}</p>}
          {error && <p className="text-red-600 text-center py-10">{error}</p>}
          {!loading && !error && posts.map((post) => (
            <Card key={post.id} shadow="sm" hoverable className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-heading truncate">{post.title}</h2>
                  <Badge tone={post.published ? "success" : "gray"} size="status">
                    {post.published ? t("publishedBadge") : t("draftBadge")}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">{t(`categories.${post.category}`)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {post.published && <Button href={`/blog/${post.slug}`} variant="ghost" size="xs">{t("view")}</Button>}
                <Button onClick={() => openEdit(post)} variant="ghost" size="xs">{t("editButton")}</Button>
                <Button onClick={() => handleDelete(post.id)} disabled={deletingId === post.id} variant="ghostDanger" size="xs">
                  {deletingId === post.id ? t("deleting") : ta("delete")}
                </Button>
              </div>
            </Card>
          ))}
          {!loading && !error && posts.length === 0 && (
            <p className="text-center text-gray-500 py-10">{t("noPostsYet")}</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );
}
