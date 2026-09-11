"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@/i18n/navigation";
import { readDocumentAsDataUrl } from "@/lib/client/image-upload";
import { errorMessage } from "@/lib/format";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

interface MagazineIssue {
  id: string;
  issueNumber: number;
  title: string;
  coverImage: string;
  intro: string;
  blogPostIds: number[];
  status: "draft" | "published";
  publishDate: string;
}

interface BlogPostOption {
  id: string;
  title: string;
  category: string;
}

const EMPTY_FORM = { issueNumber: "", title: "", coverImage: "", intro: "", blogPostIds: [] as number[], status: "draft" as "draft" | "published", publishDate: "" };

export default function AdminMagazinePage() {
  const t = useTranslations("adminMagazine");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [issues, setIssues] = useState<MagazineIssue[]>([]);
  const [posts, setPosts] = useState<BlogPostOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [coverError, setCoverError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    void loadAll();
  }, [user]);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [issuesRes, postsRes] = await Promise.all([
        fetch("/api/admin/magazine"),
        fetch("/api/admin/blog"),
      ]);
      const issuesData = await issuesRes.json();
      const postsData = await postsRes.json();
      if (!issuesRes.ok) throw new Error(issuesData.error || t("loadFailed"));
      setIssues(issuesData.issues);
      setPosts((postsData.posts || []).map((p: { id: string; title: string; category: string }) => ({ id: p.id, title: p.title, category: p.category })));
    } catch (err) {
      setError(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setLoading(false);
    }
  }

  function openEdit(issue: MagazineIssue) {
    setForm({
      issueNumber: String(issue.issueNumber),
      title: issue.title,
      coverImage: issue.coverImage || "",
      intro: issue.intro || "",
      blogPostIds: issue.blogPostIds,
      status: issue.status,
      publishDate: issue.publishDate ? issue.publishDate.slice(0, 10) : "",
    });
    setFormError("");
    setCoverError("");
    setEditingId(issue.id);
    setShowNew(false);
  }

  function openNew() {
    const nextNumber = issues.length > 0 ? Math.max(...issues.map((i) => i.issueNumber)) + 1 : 1;
    setForm({ ...EMPTY_FORM, issueNumber: String(nextNumber) });
    setFormError("");
    setCoverError("");
    setShowNew(true);
    setEditingId(null);
  }

  function closeForm() {
    setEditingId(null);
    setShowNew(false);
  }

  function toggleArticle(id: number) {
    setForm((prev) => ({
      ...prev,
      blogPostIds: prev.blogPostIds.includes(id) ? prev.blogPostIds.filter((b) => b !== id) : [...prev.blogPostIds, id],
    }));
  }

  async function handleCoverFile(file: File | null) {
    setCoverError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setCoverError(t("chooseImageFile"));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setCoverError(t("imageTooLarge"));
      return;
    }
    try {
      const dataUrl = await readDocumentAsDataUrl(file);
      setForm((prev) => ({ ...prev, coverImage: dataUrl }));
    } catch {
      setCoverError(t("couldNotReadFile"));
    }
  }

  async function handleSave() {
    if (!form.issueNumber || !form.title) {
      setFormError(t("requiredFieldsError"));
      return;
    }
    setSaving(true);
    setFormError("");
    const payload = { ...form, issueNumber: Number(form.issueNumber) };
    try {
      const url = editingId ? `/api/admin/magazine/${editingId}` : "/api/admin/magazine";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("saveFailed"));
      closeForm();
      await loadAll();
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
      const res = await fetch(`/api/admin/magazine/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || t("deleteFailed"));
      setIssues((prev) => prev.filter((i) => i.id !== id));
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
            <Button onClick={openNew} variant="gradientCta" size="compact">{t("newIssue")}</Button>
          </div>
        </div>
      </section>

      {showForm && (
        <section className="py-8 bg-white border-b border-gray-200">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-xl font-bold text-heading mb-4">{editingId ? t("editIssue") : t("newIssueHeading")}</h2>
            {formError && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{formError}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label={t("fields.issueNumber")} type="number" value={form.issueNumber} onChange={(v) => setForm({ ...form, issueNumber: v })} />
              <div className="sm:col-span-2">
                <Field label={t("fields.title")} value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t("fields.status")}</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "draft" | "published" })} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="draft">{t("statusDraft")}</option>
                  <option value="published">{t("statusPublished")}</option>
                </select>
              </div>
              <Field label={t("fields.publishDate")} type="date" value={form.publishDate} onChange={(v) => setForm({ ...form, publishDate: v })} />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("fields.intro")}</label>
              <textarea
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={3}
                value={form.intro}
                onChange={(e) => setForm({ ...form, intro: e.target.value })}
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("fields.coverImage")}</label>
              <div className="flex gap-4 items-start">
                <div className="relative w-28 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-900 border border-gray-200">
                  {form.coverImage && <img src={form.coverImage} alt={ta("preview")} className="absolute inset-0 w-full h-full object-cover" />}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="cursor-pointer inline-block rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-cream-50 transition-colors">
                    {t("uploadCover")}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCoverFile(e.target.files?.[0] || null)} />
                  </label>
                  {coverError && <p className="text-xs text-red-600">{coverError}</p>}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("fields.articles")}</label>
              <p className="text-xs text-gray-500 mb-2">{t("articlesHint")}</p>
              <div className="max-h-60 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
                {posts.map((post) => (
                  <label key={post.id} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-cream-50 cursor-pointer">
                    <input type="checkbox" checked={form.blogPostIds.includes(Number(post.id))} onChange={() => toggleArticle(Number(post.id))} className="rounded border-gray-300" />
                    <span className="flex-1">{post.title}</span>
                    <span className="text-xs text-gray-400">{post.category}</span>
                  </label>
                ))}
                {posts.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">{t("noPostsYet")}</p>}
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <Button onClick={handleSave} disabled={saving} variant="gradientFlat" size="compact">
                {saving ? ta("saving") : editingId ? t("saveChanges") : t("createIssue")}
              </Button>
              <Button onClick={closeForm} variant="ghost" size="compact">{ta("cancel")}</Button>
            </div>
          </div>
        </section>
      )}

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-4xl px-6 space-y-4">
          {loading && <p className="text-gray-500 text-center py-10">{t("loadingIssues")}</p>}
          {error && <p className="text-red-600 text-center py-10">{error}</p>}
          {!loading && !error && issues.map((issue) => (
            <Card key={issue.id} shadow="sm" hoverable className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-20 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                  {issue.coverImage && <img src={issue.coverImage} alt={issue.title} className="img-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-heading truncate">{issue.title}</h2>
                    <Badge tone={issue.status === "published" ? "success" : "gray"} size="status">{issue.status === "published" ? t("statusPublished") : t("statusDraft")}</Badge>
                  </div>
                  <p className="text-sm text-gray-500">{t("issueLabel", { number: issue.issueNumber })} &middot; {issue.blogPostIds.length} {t("articlesCount")}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => openEdit(issue)} variant="ghost" size="xs">{t("editButton")}</Button>
                <Button onClick={() => handleDelete(issue.id)} disabled={deletingId === issue.id} variant="ghostDanger" size="xs">
                  {deletingId === issue.id ? t("deleting") : ta("delete")}
                </Button>
              </div>
            </Card>
          ))}
          {!loading && !error && issues.length === 0 && (
            <p className="text-center text-gray-500 py-10">{t("noIssuesYet")}</p>
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
