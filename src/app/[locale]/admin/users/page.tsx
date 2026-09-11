"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: "active" | "suspended";
  country: string;
  createdAt: number;
}

const ROLES = ["buyer", "exhibitor", "partner", "admin"];

export default function AdminUsersPage() {
  const t = useTranslations("adminUsers");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [resetResult, setResetResult] = useState<{ name: string; password: string } | null>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    loadUsers();
  }, [user]);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("loadFailed"));
      setUsers(data.users);
    } catch (err) {
      setError(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(id: number, patch: { role?: string; status?: "active" | "suspended" }) {
    setUpdatingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("updateFailed"));
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    } catch (err) {
      setError(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleResetPassword(id: number, name: string) {
    if (!confirm(t("confirmResetPassword", { name }))) return;
    setUpdatingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("resetPasswordFailed"));
      setResetResult({ name, password: data.password });
    } catch (err) {
      setError(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(t("confirmDelete", { name }))) return;
    setUpdatingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("deleteFailed"));
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setUpdatingId(null);
    }
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{t("accessDenied")}</p></div>;
  }

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <div>
      <section className="bg-[var(--color-hero-bg)] py-8">
        <div className="mx-auto max-w-6xl px-6">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            {t("backToAdmin")}
          </Link>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
              <p className="mt-1 text-gray-400 text-sm">{t("subtitle", { count: users.length })}</p>
            </div>
            <Link href="/admin/users/bulk">
              <Button variant="save" size="sm">{t("bulkAddUsers")}</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-6xl px-6 space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full max-w-md rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          {loading ? (
            <p className="text-gray-500 text-center py-10">{ta("loading")}</p>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-cream-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold text-gray-600">{ta("name")}</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("role")}</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("statusColumn")}</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("joined")}</th>
                    <th className="text-right px-6 py-3 font-semibold text-gray-600">{ta("actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((u) => {
                    const isSelf = u.id === user.id;
                    const busy = updatingId === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-cream-50">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{u.name}</div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={u.role}
                            disabled={busy || isSelf}
                            onChange={(e) => handleUpdate(u.id, { role: e.target.value })}
                            className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold disabled:opacity-50"
                          >
                            {ROLES.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            disabled={busy || isSelf}
                            onClick={() => handleUpdate(u.id, { status: u.status === "active" ? "suspended" : "active" })}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold disabled:opacity-50 ${u.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                          >
                            {u.status === "active" ? t("statusActive") : t("statusSuspended")}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-xs">{new Date(u.createdAt * 1000).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button
                            onClick={() => handleResetPassword(u.id, u.name)}
                            disabled={busy}
                            variant="ghost"
                            size="xs"
                          >
                            {t("resetPassword")}
                          </Button>
                          <Button
                            onClick={() => handleDelete(u.id, u.name)}
                            disabled={busy || isSelf}
                            variant="ghostDanger"
                            size="xs"
                          >
                            {ta("delete")}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">{t("noResults")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {resetResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h2 className="text-lg font-bold text-heading mb-2">{t("newPasswordTitle", { name: resetResult.name })}</h2>
            <p className="text-sm text-gray-500 mb-4">{t("newPasswordHint")}</p>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-cream-50 px-4 py-3">
              <code className="flex-1 text-lg font-mono font-bold text-heading tracking-wide">{resetResult.password}</code>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(resetResult.password)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                {t("copy")}
              </button>
            </div>
            <Button onClick={() => setResetResult(null)} variant="save" size="blockSm" className="mt-5">
              {t("done")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
