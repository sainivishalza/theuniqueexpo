"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { subsidies } from "@/lib/subsidies";

export default function AdminSubsidiesPage() {
  const { user } = useAuth();
  if (!user || user.role !== "admin") return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">Admin access required.</p></div>;

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <Link href="/admin/services" className="text-sm text-blue-200 hover:text-white mb-4 inline-block">← Back to Services Admin</Link>
          <h1 className="text-3xl font-extrabold text-white">Transport Subsidies</h1>
          <p className="mt-1 text-blue-200/80">{subsidies.length} subsidies configured</p>
        </div>
      </section>
      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm"><thead className="bg-gray-50 border-b border-gray-100"><tr>
              <th className="text-left px-6 py-3 font-semibold text-gray-600">Subsidy</th>
              <th className="text-left px-6 py-3 font-semibold text-gray-600">Exhibition</th>
              <th className="text-left px-6 py-3 font-semibold text-gray-600">Amount</th>
              <th className="text-left px-6 py-3 font-semibold text-gray-600">Deadline</th>
              <th className="text-left px-6 py-3 font-semibold text-gray-600">Status</th>
            </tr></thead><tbody className="divide-y divide-gray-100">
              {subsidies.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{s.title}</td>
                  <td className="px-6 py-4 text-gray-500">{s.exhibitionTitle}</td>
                  <td className="px-6 py-4 text-gray-900">{s.amount}</td>
                  <td className="px-6 py-4 text-gray-500">{s.deadline}</td>
                  <td className="px-6 py-4"><span className={`rounded-lg px-2 py-1 text-xs font-bold ${s.status === "open" ? "bg-green-100 text-green-700" : s.status === "closing-soon" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>{s.status}</span></td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </div>
      </section>
    </div>
  );
}
