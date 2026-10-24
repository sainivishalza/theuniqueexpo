"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { fieldClasses } from "@/components/ui/FormField";
import Button from "@/components/ui/Button";

interface Row {
  id: number;
  adminId: number | null;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  ip: string;
  createdAt: number;
}

interface Result {
  rows: Row[];
  total: number;
  actions: string[];
  admins: { id: number; name: string }[];
}

const PAGE_SIZE = 50;

// Admin -> Activity: who did what in the admin area (sign-ins, people, documents, points, settings).
export default function AdminActivityPage() {
  const t = useTranslations("adminActivity");
  const ta = useTranslations("adminCommon");
  const locale = useLocale();
  const { user, loading: authLoading } = useAuth();
  const ids = { q: useId(), action: useId(), admin: useId() };
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [adminId, setAdminId] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("q", search);
    if (action) params.set("action", action);
    if (adminId) params.set("admin", adminId);
    try {
      const res = await fetch(`/api/admin/activity?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
      setError(false);
    } catch {
      setError(true);
    }
  }, [page, search, action, adminId]);

  useEffect(() => {
    if (user?.role === "admin") void load();
  }, [user, load]);

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-600">{ta("accessRequired")}</p></div>;
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const label = (a: string) => (t.has(`actions.${a}`) ? t(`actions.${a}`) : a);

  return (
    <div>
      <section className="bg-[var(--color-hero-bg)] py-8">
        <div className="mx-auto max-w-6xl px-6">
          <Link href="/admin" className="py-1 mb-4 inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white">{ta("backToAdmin")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-400">{t("subtitle")}</p>
        </div>
      </section>

      <section className="bg-cream-50 py-8">
        <div className="mx-auto max-w-6xl space-y-4 px-6">
          <form
            role="search"
            onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q.trim()); }}
            className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
          >
            <div>
              <label htmlFor={ids.q} className="mb-1 block text-sm font-medium text-gray-700">{t("search")}</label>
              <input id={ids.q} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPlaceholder")} className={fieldClasses()} />
            </div>
            <div>
              <label htmlFor={ids.admin} className="mb-1 block text-sm font-medium text-gray-700">{t("who")}</label>
              <select id={ids.admin} value={adminId} onChange={(e) => { setPage(1); setAdminId(e.target.value); }} className={fieldClasses()}>
                <option value="">{t("everyone")}</option>
                {data?.admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={ids.action} className="mb-1 block text-sm font-medium text-gray-700">{t("what")}</label>
              <select id={ids.action} value={action} onChange={(e) => { setPage(1); setAction(e.target.value); }} className={fieldClasses()}>
                <option value="">{t("everything")}</option>
                {data?.actions.map((a) => <option key={a} value={a}>{label(a)}</option>)}
              </select>
            </div>
            <Button type="submit" variant="save" size="compact">{t("searchButton")}</Button>
          </form>

          {error && <div role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{t("loadFailed")}</div>}

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            {!data ? (
              <p className="p-2 text-sm text-gray-600">{t("loading")}</p>
            ) : data.rows.length === 0 ? (
              <p className="p-2 text-sm text-gray-600">{t("empty")}</p>
            ) : (
              <>
                <p role="status" className="px-1 pb-3 text-sm text-gray-600">{t("count", { count: data.total })}</p>
                <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={t("title")}>
                  <table className="w-full min-w-[44rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-600">
                        <th scope="col" className="px-2 py-2 font-semibold">{t("time")}</th>
                        <th scope="col" className="px-2 py-2 font-semibold">{t("who")}</th>
                        <th scope="col" className="px-2 py-2 font-semibold">{t("what")}</th>
                        <th scope="col" className="px-2 py-2 font-semibold">{t("details")}</th>
                        <th scope="col" className="px-2 py-2 font-semibold">{t("address")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.rows.map((r) => (
                        <tr key={r.id} className="align-top">
                          <td className="whitespace-nowrap px-2 py-2 text-gray-700">{new Date(r.createdAt * 1000).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}</td>
                          <td className="px-2 py-2 font-semibold text-gray-900">{r.adminName || t("unknown")}</td>
                          <td className="px-2 py-2 text-gray-900">
                            {label(r.action)}
                            {r.targetId && <span className="ml-1 text-xs text-gray-500">#{r.targetId}</span>}
                          </td>
                          <td className="break-words px-2 py-2 text-gray-700">{r.details}</td>
                          <td className="whitespace-nowrap px-2 py-2 text-xs text-gray-600">{r.ip}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pages > 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-1 pt-4 mt-3">
                    <span className="text-sm text-gray-600">{t("pageOf", { page, pages })}</span>
                    <div className="flex gap-2">
                      <Button type="button" variant="secondaryOutline" size="xs" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("newer")}</Button>
                      <Button type="button" variant="secondaryOutline" size="xs" disabled={page >= pages} onClick={() => setPage(page + 1)}>{t("older")}</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
