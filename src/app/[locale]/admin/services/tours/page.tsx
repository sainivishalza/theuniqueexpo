"use client";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { businessToursData as businessTours, chinaToursData as chinaTours } from "@/lib/tours";

export default function AdminToursPage() {
  const t = useTranslations("adminServiceTours");
  const ta = useTranslations("adminCommon");
  const { user } = useAuth();
  if (!user || user.role !== "admin") return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{ta("accessRequired")}</p></div>;

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <Link href="/admin/services" className="text-sm text-emerald-200 hover:text-white mb-4 inline-block">{t("backToServicesAdmin")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{t("toursSummary", { business: businessTours.length, china: chinaTours.length })}</p>
        </div>
      </section>
      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 space-y-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t("businessTours")}</h2>
            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
              <table className="w-full text-sm"><thead className="bg-gray-50 border-b border-gray-100"><tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("columns.tour")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("columns.city")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("columns.dates")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("columns.price")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{ta("actions")}</th>
              </tr></thead><tbody className="divide-y divide-gray-100">
                {businessTours.map((t2) => (
                  <tr key={t2.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{t2.title.en}</td>
                    <td className="px-6 py-4 text-gray-500">{t2.city}</td>
                    <td className="px-6 py-4 text-gray-500">{t2.dates}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">${t2.price}</td>
                    <td className="px-6 py-4"><Link href={"/services/business-tours/" + t2.slug} className="text-emerald-600 hover:underline text-sm">{t("view")}</Link></td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t("chinaTours")}</h2>
            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
              <table className="w-full text-sm"><thead className="bg-gray-50 border-b border-gray-100"><tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("columns.tour")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("columns.city")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("columns.dates")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("columns.price")}</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">{ta("actions")}</th>
              </tr></thead><tbody className="divide-y divide-gray-100">
                {chinaTours.map((t2) => (
                  <tr key={t2.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{t2.title.en}</td>
                    <td className="px-6 py-4 text-gray-500">{t2.city}</td>
                    <td className="px-6 py-4 text-gray-500">{t2.dates}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">${t2.price}</td>
                    <td className="px-6 py-4"><Link href={"/services/china-tours/" + t2.slug} className="text-emerald-600 hover:underline text-sm">{t("view")}</Link></td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
