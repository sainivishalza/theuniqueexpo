"use client";
import { isPlaceholderEmail } from "@/lib/login-id";
import { parseBuyerNumber } from "@/lib/buyer-number";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import UrlSearchSync from "@/components/UrlSearchSync";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: "active" | "suspended";
  country: string;
  createdAt: number;
  // TUE0001 ... for buyers; empty for other roles.
  buyerNumber: string;
}

const ROLES = ["buyer", "exhibitor", "partner", "admin"];

// The list draws this many people at a time (then "Show more"): with a couple of
// thousand accounts a single table of every row made typing in the search box lag.
const PAGE_SIZE = 100;

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

  // The search box stays responsive while the (deferred) list catches up.
  const deferredSearch = useDeferredValue(search);
  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return users;
    // "TUE12", "tue0012" and "12" all find buyer number 12.
    const asNumber = /^(tue)?\s*\d+$/i.test(q) ? parseBuyerNumber(q) : null;
    const matches = users.filter((u) => {
      if (asNumber !== null && parseBuyerNumber(u.buyerNumber) === asNumber) return true;
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.buyerNumber.toLowerCase().includes(q);
    });
    // Searching "TUE12" also matches TUE1200-TUE1299: keep the exact number on the first page.
    const exact = asNumber === null ? -1 : matches.findIndex((u) => parseBuyerNumber(u.buyerNumber) === asNumber);
    if (exact > 0) matches.unshift(...matches.splice(exact, 1));
    return matches;
  }, [users, deferredSearch]);
  // How many pages of the list are showing. A new search starts again from the first
  // page (state adjusted while rendering, the pattern React documents for "reset state
  // when an input changes").
  const [pageState, setPageState] = useState({ key: deferredSearch, pages: 1 });
  if (pageState.key !== deferredSearch) setPageState({ key: deferredSearch, pages: 1 });
  const visible = filtered.slice(0, pageState.pages * PAGE_SIZE);

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
      // Making someone a buyer gives them a registration number -- fetch it.
      if (patch.role === "buyer") await loadUsers();
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
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/users/import-buyers">
                <Button variant="outline" size="sm">{t("importBuyers")}</Button>
              </Link>
              <Link href="/admin/users/bulk">
                <Button variant="save" size="sm">{t("bulkAddUsers")}</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-6xl px-6 space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

          {/* The admin menu's search sends "?q=..." here to open the list already filtered. */}
          <UrlSearchSync onChange={setSearch} />
          <input
            type="text"
            aria-label={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full max-w-md rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          {loading ? (
            <p className="text-gray-500 text-center py-10">{ta("loading")}</p>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm">
              <div className="overflow-x-auto rounded-2xl">
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
                    {visible.map((u) => {
                      const isSelf = u.id === user.id;
                      const busy = updatingId === u.id;
                      return (
                        <tr key={u.id} className="hover:bg-cream-50">
                          <td className="px-6 py-4">
                            {u.buyerNumber && <div className="text-xs font-bold tracking-wide text-emerald-700">{u.buyerNumber}</div>}
                            <div className="font-semibold text-gray-900">{u.name}</div>
                            <div className="text-xs text-gray-500">{isPlaceholderEmail(u.email) ? t("noEmail") : u.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              aria-label={`${t("role")}: ${u.name}`}
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
                          <td className="px-6 py-4 text-gray-500 text-xs">{new Date(u.createdAt * 1000).toLocaleDateString()}</td>
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
              {filtered.length > visible.length && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
                  <span role="status" className="text-sm text-gray-600">{t("showingOf", { shown: visible.length, total: filtered.length })}</span>
                  <Button
                    onClick={() => setPageState({ key: deferredSearch, pages: pageState.pages + 1 })}
                    variant="secondaryOutline"
                    size="xs"
                  >
                    {t("showMore", { count: Math.min(PAGE_SIZE, filtered.length - visible.length) })}
                  </Button>
                </div>
              )}
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
