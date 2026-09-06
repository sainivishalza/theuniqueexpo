"use client";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { subsidies } from "@/lib/subsidies";
import Badge from "@/components/ui/Badge";

export default function AdminSubsidiesPage() {
  const t = useTranslations("adminSubsidies");
  const ta = useTranslations("adminCommon");
  const { user } = useAuth();
  if (!user || user.role !== "admin") return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{ta("accessRequired")}</p></div>;

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <Link href="/admin/services" className="text-sm text-emerald-200 hover:text-white mb-4 inline-block">{t("backToServicesAdmin")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{t("subsidiesConfigured", { count: subsidies.length })}</p>
        </div>
      </section>
      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm"><thead className="bg-cream-50 border-b border-gray-100"><tr>
              <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("columns.subsidy")}</th>
              <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("columns.exhibition")}</th>
              <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("columns.amount")}</th>
              <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("columns.deadline")}</th>
              <th className="text-left px-6 py-3 font-semibold text-gray-600">{ta("status")}</th>
            </tr></thead><tbody className="divide-y divide-gray-100">
              {subsidies.map((s) => (
                <tr key={s.id} className="hover:bg-cream-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{s.title}</td>
                  <td className="px-6 py-4 text-gray-500">{s.exhibitionTitle}</td>
                  <td className="px-6 py-4 text-gray-900">{s.amount}</td>
                  <td className="px-6 py-4 text-gray-500">{s.deadline}</td>
                  <td className="px-6 py-4"><Badge tone={s.status === "open" ? "success" : s.status === "closing-soon" ? "warning" : "gray"} size="tag">{s.status}</Badge></td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </div>
      </section>
    </div>
  );
}
