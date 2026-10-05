"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import Card from "@/components/ui/Card";

interface Subscriber { id: string; email: string; locale: string; createdAt: string }

export default function AdminNewsletterPage() {
  const t = useTranslations("adminNewsletter");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch("/api/admin/newsletter")
      .then((res) => res.json())
      .then((data) => setSubscribers(data.subscribers || []))
      .finally(() => setLoading(false));
  }, [user]);

  function downloadCsv() {
    const rows = [["email", "language", "subscribed_at"], ...subscribers.map((s) => [s.email, s.locale, new Date(s.createdAt).toISOString()])];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "newsletter-subscribers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{ta("accessRequired")}</p></div>;

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <Link href="/admin" className="text-sm text-emerald-200 hover:text-white mb-4 inline-block">{ta("backToAdmin")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{loading ? ta("loading") : t("subscribersCount", { count: subscribers.length })}</p>
          {subscribers.length > 0 && (
            <button onClick={downloadCsv} className="mt-4 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25 transition-colors">
              {t("downloadCsv")}
            </button>
          )}
        </div>
      </section>
      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-7xl px-6">
          {!loading && subscribers.length === 0 ? (
            <Card shadow="sm" bordered={false} className="text-center py-20">
              <div className="text-5xl mb-4">✉️</div>
              <h3 className="text-xl font-bold text-heading mb-2">{t("noResultsTitle")}</h3>
              <p className="text-gray-500">{t("noResultsSubtitle")}</p>
            </Card>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
              <table className="w-full text-sm"><thead className="bg-cream-50 border-b border-gray-100"><tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{ta("email")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("language")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{ta("date")}</th>
              </tr></thead><tbody className="divide-y divide-gray-100">
                {subscribers.map((s) => (
                  <tr key={s.id} className="hover:bg-cream-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{s.email}</td>
                    <td className="px-6 py-4 text-gray-500 uppercase">{s.locale}</td>
                    <td className="px-6 py-4 text-gray-400 text-xs">{new Date(s.createdAt).toLocaleDateString()}</td>
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
