"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import Card from "@/components/ui/Card";

interface AdminReferral {
  id: number;
  partnerName: string;
  partnerEmail: string;
  referredUserName: string;
  referredUserEmail: string;
  conversionStatus: "signed_up" | "booked_booth" | "posted_rfq";
  commission: number;
  createdAt: number;
}

const STATUSES = ["signed_up", "booked_booth", "posted_rfq"];

export default function AdminPartnerReferralsPage() {
  const t = useTranslations("adminPartnerReferrals");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [referrals, setReferrals] = useState<AdminReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [commissionDrafts, setCommissionDrafts] = useState<Record<number, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch("/api/admin/partner-referrals")
      .then((res) => res.json())
      .then((data) => {
        setReferrals(data.referrals || []);
        setCommissionDrafts(Object.fromEntries((data.referrals || []).map((r: AdminReferral) => [r.id, String(r.commission)])));
      })
      .catch((err) => setError(errorMessage(err, ta("somethingWentWrong"))))
      .finally(() => setLoading(false));
  }, [user]);

  async function updateReferral(id: number, patch: { conversionStatus?: string; commission?: number }) {
    setUpdatingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/partner-referrals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("updateFailed"));
      setReferrals((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } as AdminReferral : r)));
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
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <Link href="/admin/partner-tiers" className="text-sm text-emerald-200 hover:text-white mb-4 inline-block">{t("backToTiers")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{loading ? ta("loading") : t("referralsFound", { count: referrals.length })}</p>
        </div>
      </section>
      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-7xl px-6">
          {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
          {!loading && referrals.length === 0 ? (
            <Card shadow="sm" bordered={false} className="text-center py-20">
              <div className="text-5xl mb-4">🤝</div>
              <h3 className="text-xl font-bold text-heading mb-2">{t("noResultsTitle")}</h3>
              <p className="text-gray-500">{t("noResultsSubtitle")}</p>
            </Card>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
              <table className="w-full text-sm"><thead className="bg-cream-50 border-b border-gray-100"><tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("partner")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("referredUser")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{ta("status")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("commission")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{ta("date")}</th>
              </tr></thead><tbody className="divide-y divide-gray-100">
                {referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-cream-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{r.partnerName}<br/><span className="text-xs text-gray-400">{r.partnerEmail}</span></td>
                    <td className="px-6 py-4 text-gray-500">{r.referredUserName}<br/><span className="text-xs text-gray-400">{r.referredUserEmail}</span></td>
                    <td className="px-6 py-4">
                      <select
                        value={r.conversionStatus}
                        disabled={updatingId === r.id}
                        onChange={(e) => updateReferral(r.id, { conversionStatus: e.target.value })}
                        className={`rounded-lg px-2 py-1 text-xs font-bold border-0 disabled:opacity-50 ${r.conversionStatus === "booked_booth" ? "bg-green-100 text-green-700" : r.conversionStatus === "posted_rfq" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{t(`statuses.${s}`)}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={commissionDrafts[r.id] ?? String(r.commission)}
                          onChange={(e) => setCommissionDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                        />
                        <button
                          disabled={updatingId === r.id}
                          onClick={() => updateReferral(r.id, { commission: Number(commissionDrafts[r.id]) || 0 })}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                        >
                          {ta("save")}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">{new Date(r.createdAt * 1000).toLocaleDateString()}</td>
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
