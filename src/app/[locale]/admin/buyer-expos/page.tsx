"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/ui/Button";

interface Expo {
  id: number;
  name: string;
  buyerCount: number;
}

export default function AdminBuyerExposPage() {
  const t = useTranslations("adminBuyerExpos");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [expos, setExpos] = useState<Expo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  function apiError(code: unknown): string {
    return code === "empty" || code === "too_long" || code === "duplicate" || code === "not_found"
      ? t(`errors.${code}`)
      : ta("somethingWentWrong");
  }

  async function load() {
    try {
      const res = await fetch("/api/admin/buyer-expos");
      const data = await res.json();
      if (!res.ok) throw new Error();
      setExpos(data.expos);
    } catch {
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAdding(true);
    try {
      const res = await fetch("/api/admin/buyer-expos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiError(data.error));
      setNewName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : ta("somethingWentWrong"));
    } finally {
      setAdding(false);
    }
  }

  async function handleRename(id: number) {
    setError("");
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/buyer-expos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiError(data.error));
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : ta("somethingWentWrong"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(expo: Expo) {
    if (!window.confirm(t("deleteConfirm", { name: expo.name, count: expo.buyerCount }))) return;
    setError("");
    setBusyId(expo.id);
    try {
      const res = await fetch(`/api/admin/buyer-expos/${expo.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(ta("somethingWentWrong"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : ta("somethingWentWrong"));
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{ta("accessRequired")}</p></div>;
  }

  return (
    <div>
      <section className="bg-[var(--color-hero-bg)] py-8">
        <div className="mx-auto max-w-3xl px-6">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4">
            {ta("backToAdmin")}
          </Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-gray-400 text-sm">{t("subtitle")}</p>
        </div>
      </section>

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-3xl px-6 space-y-6">
          {error && <div role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

          <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col sm:flex-row gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("newPlaceholder")}
              aria-label={t("newPlaceholder")}
              maxLength={255}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 outline-none"
            />
            <Button type="submit" variant="save" size="compact" disabled={adding || !newName.trim()}>
              {adding ? ta("saving") : t("add")}
            </Button>
          </form>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <p className="p-6 text-sm text-gray-500">{ta("loading")}</p>
            ) : expos.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">{t("empty")}</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {expos.map((expo) => (
                  <li key={expo.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3">
                    {editingId === expo.id ? (
                      <>
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleRename(expo.id); if (e.key === "Escape") setEditingId(null); }}
                          maxLength={255}
                          aria-label={t("rename")}
                          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                        />
                        <div className="flex gap-2">
                          <Button onClick={() => handleRename(expo.id)} variant="save" size="compact" disabled={busyId === expo.id || !editName.trim()}>
                            {ta("save")}
                          </Button>
                          <Button onClick={() => setEditingId(null)} variant="ghost" size="compact">{ta("cancel")}</Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 break-words">{expo.name}</p>
                          <p className="text-xs text-gray-400">{t("buyers", { count: expo.buyerCount })}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => { setEditingId(expo.id); setEditName(expo.name); }} variant="ghost" size="compact" disabled={busyId === expo.id}>
                            {t("rename")}
                          </Button>
                          <Button onClick={() => handleDelete(expo)} variant="ghostDanger" size="compact" disabled={busyId === expo.id}>
                            {ta("delete")}
                          </Button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
