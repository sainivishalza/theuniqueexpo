"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import Card from "@/components/ui/Card";

interface DestinationInterest {
  id: string; destination: string; name: string; email: string; phone: string;
  message: string; status: string; createdAt: string;
}

const STATUSES = ["pending", "in-progress", "completed"];

export default function AdminTourDestinationInterestPage() {
  const t = useTranslations("adminTourDestinationInterest");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<DestinationInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch("/api/admin/tour-destination-interest")
      .then((res) => res.json())
      .then((data) => setRequests(data.requests || []))
      .finally(() => setLoading(false));
  }, [user]);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/tour-destination-interest/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error || t("updateFailed"));
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (err) {
      alert(errorMessage(err, ta("somethingWentWrong")));
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
          <p className="mt-1 text-emerald-200/80">{loading ? ta("loading") : t("requestsReceived", { count: requests.length })}</p>
        </div>
      </section>
      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-7xl px-6">
          {!loading && requests.length === 0 ? (
            <Card shadow="sm" bordered={false} className="text-center py-20">
              <div className="text-5xl mb-4">🗺️</div>
              <h3 className="text-xl font-bold text-heading mb-2">{t("noResultsTitle")}</h3>
              <p className="text-gray-500">{t("noResultsSubtitle")}</p>
            </Card>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
              <table className="w-full text-sm"><thead className="bg-cream-50 border-b border-gray-100"><tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("destination")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{ta("name")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("message")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{ta("status")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{ta("date")}</th>
              </tr></thead><tbody className="divide-y divide-gray-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-cream-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{r.destination}</td>
                    <td className="px-6 py-4 text-gray-500">{r.name}<br/><span className="text-xs text-gray-400">{r.email}{r.phone ? ` · ${r.phone}` : ""}</span></td>
                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={r.message}>{r.message || "—"}</td>
                    <td className="px-6 py-4">
                      <select
                        value={r.status}
                        disabled={updatingId === r.id}
                        onChange={(e) => updateStatus(r.id, e.target.value)}
                        className={`rounded-lg px-2 py-1 text-xs font-bold border-0 disabled:opacity-50 ${r.status === "completed" ? "bg-green-100 text-green-700" : r.status === "in-progress" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{t(`statuses.${s}`)}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
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
