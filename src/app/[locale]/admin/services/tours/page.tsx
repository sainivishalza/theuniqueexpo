"use client";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { businessTours, chinaTours } from "@/lib/tours";

export default function AdminToursPage() {
  const { user } = useAuth();
  if (!user || user.role !== "admin") return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">Admin access required.</p></div>;

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <Link href="/admin/services" className="text-sm text-emerald-200 hover:text-white mb-4 inline-block">← Back to Services Admin</Link>
          <h1 className="text-3xl font-extrabold text-white">Manage Tours</h1>
          <p className="mt-1 text-emerald-200/80">{businessTours.length} business tours + {chinaTours.length} China tours</p>
        </div>
      </section>
      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 space-y-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Business Tours</h2>
            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
              <table className="w-full text-sm"><thead className="bg-gray-50 border-b border-gray-100"><tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Tour</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">City</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Dates</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Price</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Actions</th>
              </tr></thead><tbody className="divide-y divide-gray-100">
                {businessTours.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{t.title}</td>
                    <td className="px-6 py-4 text-gray-500">{t.city}</td>
                    <td className="px-6 py-4 text-gray-500">{t.dates}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">${t.price}</td>
                    <td className="px-6 py-4"><Link href={"/services/business-tours/" + t.slug} className="text-emerald-600 hover:underline text-sm">View →</Link></td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">China Tours</h2>
            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
              <table className="w-full text-sm"><thead className="bg-gray-50 border-b border-gray-100"><tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Tour</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">City</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Dates</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Price</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Actions</th>
              </tr></thead><tbody className="divide-y divide-gray-100">
                {chinaTours.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{t.title}</td>
                    <td className="px-6 py-4 text-gray-500">{t.city}</td>
                    <td className="px-6 py-4 text-gray-500">{t.dates}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">${t.price}</td>
                    <td className="px-6 py-4"><Link href={"/services/china-tours/" + t.slug} className="text-emerald-600 hover:underline text-sm">View →</Link></td>
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
