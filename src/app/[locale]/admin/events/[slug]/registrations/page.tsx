"use client";
import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import Card from "@/components/ui/Card";
import BulkStatusBar, { bulkOptions } from "../../../BulkStatusBar";
import SearchBox, { SearchEmpty, useListSearch } from "@/components/search/ListSearch";

interface Event { id: string; slug: string; title: string; }
interface Registration {
  id: string;
  userName: string;
  userEmail: string;
  status: string;
  createdAt: string;
}

const STATUSES = ["pending", "confirmed", "cancelled"];

export default function AdminEventRegistrationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const t = useTranslations("adminEventRegistrations");
  const ta = useTranslations("adminCommon");
  const tb = useTranslations("adminBulkDecision");
  const tbo = useTranslations("adminBulkOther");
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const search = useListSearch(registrations);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [ticked, setTicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch(`/api/admin/event-registrations?event=${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setEvent(data.event);
        setRegistrations(data.registrations || []);
      })
      .catch((err) => setError(errorMessage(err, ta("somethingWentWrong"))))
      .finally(() => setLoading(false));
  }, [user, slug]);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/event-registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error || t("updateFailed"));
      setRegistrations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (err) {
      alert(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setUpdatingId(null);
    }
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{ta("accessRequired")}</p></div>;
  }

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <Link href="/admin/events" className="text-sm text-emerald-200 hover:text-white mb-4 inline-block">{t("backToEvents")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{event ? t("titleWithName", { name: event.title }) : t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{loading ? ta("loading") : t("registeredCount", { count: registrations.length })}</p>
        </div>
      </section>

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-7xl px-6">
          {error && <p className="text-red-600 text-center py-10">{error}</p>}
          {!loading && !error && registrations.length === 0 ? (
            <Card shadow="sm" bordered={false} className="text-center py-20">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-heading mb-2">{t("noResultsTitle")}</h3>
              <p className="text-gray-500">{t("noResultsSubtitle")}</p>
            </Card>
          ) : !error && (
            <>
              <BulkStatusBar
                endpoint="/api/admin/event-registrations/bulk-status"
                ids={Array.from(ticked)}
                options={bulkOptions(["confirmed", "cancelled"], tbo)}
                onApplied={(changed, status) => { setRegistrations((prev) => prev.map((r) => (changed.includes(r.id) ? { ...r, status } : r))); setTicked(new Set()); }}
                onClear={() => setTicked(new Set())}
              />
              <SearchBox value={search.query} onChange={search.setQuery} shown={search.shown} total={search.total} />
              {search.active && search.shown === 0 && <SearchEmpty query={search.query} onClear={() => search.setQuery("")} />}
              <div className={`bg-white rounded-2xl shadow-sm max-h-[calc(100vh-6rem)] overflow-auto ${search.active && search.shown === 0 ? "hidden" : ""}`}>
              <table className="w-full text-sm"><thead className="bg-cream-50 border-b border-gray-100"><tr>
                <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 w-10">
                  <input type="checkbox" aria-label={tb("selectAll")} checked={search.results.length > 0 && search.results.every((r) => ticked.has(r.id))}
                    onChange={() => setTicked((prev) => (search.results.every((r) => prev.has(r.id)) ? new Set() : new Set(search.results.map((r) => r.id))))} className="h-4 w-4 rounded border-gray-300" />
                </th>
                <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 font-semibold text-gray-600">{ta("name")}</th>
                <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 font-semibold text-gray-600">{ta("email")}</th>
                <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 font-semibold text-gray-600">{ta("status")}</th>
                <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 font-semibold text-gray-600">{ta("date")}</th>
              </tr></thead><tbody className="divide-y divide-gray-100">
                {search.results.map((r) => (
                  <tr key={r.id} className="hover:bg-cream-50">
                    <td className="px-6 py-4">
                      <input type="checkbox" checked={ticked.has(r.id)} onChange={() => setTicked((prev) => { const next = new Set(prev); if (next.has(r.id)) next.delete(r.id); else next.add(r.id); return next; })}
                        aria-label={tb("selectRow", { name: r.userName })} className="h-4 w-4 rounded border-gray-300" />
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{r.userName}</td>
                    <td className="px-6 py-4 text-gray-500">{r.userEmail}</td>
                    <td className="px-6 py-4">
                      <select
                        aria-label={`${ta("status")}: ${r.userName}`}
                        value={r.status}
                        disabled={updatingId === r.id}
                        onChange={(e) => updateStatus(r.id, e.target.value)}
                        className={`rounded-lg px-2 py-1 text-xs font-bold border-0 disabled:opacity-50 ${r.status === "confirmed" ? "bg-green-100 text-green-700" : r.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{t(`statuses.${s}`)}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody></table>
            </div></>
          )}
        </div>
      </section>
    </div>
  );
}
