"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getVisaApplications } from "@/lib/visa-setup";

export default function AdminVisaAppsPage() {
  const { user } = useAuth();
  if (!user || user.role !== "admin") return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">Admin access required.</p></div>;
  const apps = getVisaApplications();
  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <Link href="/admin/services" className="text-sm text-blue-200 hover:text-white mb-4 inline-block">← Back to Services Admin</Link>
          <h1 className="text-3xl font-extrabold text-white">Visa & Setup Applications</h1>
          <p className="mt-1 text-blue-200/80">{apps.length} applications received</p>
        </div>
      </section>
      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          {apps.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No applications yet</h3>
              <p className="text-gray-500">Visa and company setup applications will appear here.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-sm"><thead className="bg-gray-50 border-b border-gray-100"><tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Service</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Date</th>
              </tr></thead><tbody className="divide-y divide-gray-100">
                {apps.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{a.name}<br/><span className="text-xs text-gray-400">{a.email}</span></td>
                    <td className="px-6 py-4 text-gray-500">{a.serviceType}</td>
                    <td className="px-6 py-4"><span className={`rounded-lg px-2 py-1 text-xs font-bold ${a.status === "completed" ? "bg-green-100 text-green-700" : a.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{a.status}</span></td>
                    <td className="px-6 py-4 text-gray-400 text-xs">{new Date(a.createdAt).toLocaleDateString()}</td>
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
