"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";

interface MovingQuote {
  id: string; name: string; email: string; originCity: string; destinationCity: string; movingType: string; status: string; createdAt: string;
}

const STATUSES = ["pending", "quoted", "completed"];

export default function AdminMovingQuotesPage() {
  const t = useTranslations("adminMovingQuotes");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [quotes, setQuotes] = useState<MovingQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch("/api/admin/moving-quotes")
      .then((res) => res.json())
      .then((data) => setQuotes(data.quotes || []))
      .finally(() => setLoading(false));
  }, [user]);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/moving-quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error || t("updateFailed"));
      setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
    } catch (err) {
      alert(errorMessage(err, "Something went wrong"));
    } finally {
      setUpdatingId(null);
    }
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{ta("accessRequired")}</p></div>;

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <Link href="/admin/services" className="text-sm text-emerald-200 hover:text-white mb-4 inline-block">{t("backToServicesAdmin")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{loading ? ta("loading") : t("requestsReceived", { count: quotes.length })}</p>
        </div>
      </section>
      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          {!loading && quotes.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
              <div className="text-5xl mb-4">📦</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t("noResultsTitle")}</h3>
              <p className="text-gray-500">{t("noResultsSubtitle")}</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
              <table className="w-full text-sm"><thead className="bg-gray-50 border-b border-gray-100"><tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{ta("name")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("route")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("movingType")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{ta("status")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{ta("date")}</th>
              </tr></thead><tbody className="divide-y divide-gray-100">
                {quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{q.name}<br/><span className="text-xs text-gray-400">{q.email}</span></td>
                    <td className="px-6 py-4 text-gray-500">{q.originCity} → {q.destinationCity}</td>
                    <td className="px-6 py-4 text-gray-500">{q.movingType}</td>
                    <td className="px-6 py-4">
                      <select
                        value={q.status}
                        disabled={updatingId === q.id}
                        onChange={(e) => updateStatus(q.id, e.target.value)}
                        className={`rounded-lg px-2 py-1 text-xs font-bold border-0 disabled:opacity-50 ${q.status === "completed" ? "bg-green-100 text-green-700" : q.status === "quoted" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{t(`statuses.${s}`)}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">{new Date(q.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
