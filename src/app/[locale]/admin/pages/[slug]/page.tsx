"use client";
import { use, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { SITE_PAGES, isValidSitePageSlug, type SitePageContent, type SitePageItem } from "@/lib/site-pages";

const EMPTY_CONTENT: SitePageContent = {
  heading: "", tagline: "", body: "", itemsLabel: "Details", items: [], contactEmail: "", contactPhone: "",
};

export default function AdminSitePageEditor({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [content, setContent] = useState<SitePageContent>(EMPTY_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const pageDef = SITE_PAGES.find((p) => p.slug === slug);

  useEffect(() => {
    if (!user || user.role !== "admin" || !isValidSitePageSlug(slug)) return;
    fetch(`/api/admin/pages/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setContent(data.content);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, slug]);

  function update(patch: Partial<SitePageContent>) {
    setContent((prev) => ({ ...prev, ...patch }));
  }

  function updateItem(index: number, patch: Partial<SitePageItem>) {
    setContent((prev) => ({ ...prev, items: prev.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) }));
  }

  function addItem() {
    setContent((prev) => ({ ...prev, items: [...prev.items, { title: "", description: "" }] }));
  }

  function removeItem(index: number) {
    setContent((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/pages/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">Admin access required.</p></div>;
  }
  if (!pageDef) {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">Unknown page.</p></div>;
  }

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-4xl px-6">
          <Link href="/admin/pages" className="text-sm text-emerald-200 hover:text-white mb-4 inline-block">← Back to Website Pages</Link>
          <h1 className="text-3xl font-extrabold text-white">{pageDef.navLabel}</h1>
          <p className="mt-1 text-emerald-200/80">
            Edit what visitors see at <Link href={pageDef.path} target="_blank" className="underline hover:text-white">{pageDef.path}</Link>.
          </p>
        </div>
      </section>

      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-4xl px-6 space-y-6">
          {loading ? (
            <p className="text-center text-gray-500 py-10">Loading...</p>
          ) : (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
                <h2 className="font-bold text-gray-900">Header</h2>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Heading</label>
                  <input
                    type="text"
                    value={content.heading}
                    onChange={(e) => update({ heading: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Tagline</label>
                  <input
                    type="text"
                    value={content.tagline}
                    onChange={(e) => update({ tagline: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
                <h2 className="font-bold text-gray-900">Body Text</h2>
                <p className="text-xs text-gray-400">Separate paragraphs with a blank line. Leave empty to hide.</p>
                <textarea
                  value={content.body}
                  onChange={(e) => update({ body: e.target.value })}
                  rows={5}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                <h2 className="font-bold text-gray-900">Contact Details (optional)</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
                    <input
                      type="text"
                      value={content.contactEmail}
                      onChange={(e) => update({ contactEmail: e.target.value })}
                      placeholder="info@theuniqueexpo.com"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Phone</label>
                    <input
                      type="text"
                      value={content.contactPhone}
                      onChange={(e) => update({ contactPhone: e.target.value })}
                      placeholder="+86 400 000 0000"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                <div>
                  <h2 className="font-bold text-gray-900">Items List</h2>
                  <label className="block text-xs font-semibold text-gray-500 mt-3 mb-1">Section heading</label>
                  <input
                    type="text"
                    value={content.itemsLabel}
                    onChange={(e) => update({ itemsLabel: e.target.value })}
                    placeholder="e.g. FAQs, Open Positions, Endpoints"
                    className="w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                {content.items.map((item, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 p-4 space-y-2">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateItem(i, { title: e.target.value })}
                      placeholder="Title"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold"
                    />
                    <textarea
                      value={item.description}
                      onChange={(e) => updateItem(i, { description: e.target.value })}
                      placeholder="Description"
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y"
                    />
                    <button onClick={() => removeItem(i)} className="text-xs font-semibold text-red-600 hover:underline">Remove</button>
                  </div>
                ))}
                <button
                  onClick={addItem}
                  className="w-full rounded-xl border-2 border-dashed border-gray-300 py-2.5 text-sm font-semibold text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                >
                  + Add Item
                </button>
              </div>

              {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {saved && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Saved.</div>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-xl gradient-brand py-4 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Saving..." : `Save ${pageDef.navLabel}`}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
