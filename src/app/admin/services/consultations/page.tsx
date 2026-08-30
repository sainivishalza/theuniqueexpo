"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function AdminConsultationsPage() {
  const { user } = useAuth();
  if (!user || user.role !== "admin") return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">Admin access required.</p></div>;

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <Link href="/admin/services" className="text-sm text-blue-200 hover:text-white mb-4 inline-block">← Back to Services Admin</Link>
          <h1 className="text-3xl font-extrabold text-white">Consultation Requests</h1>
          <p className="mt-1 text-blue-200/80">Manage consultation bookings</p>
        </div>
      </section>
      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <div className="text-5xl mb-4">💬</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No consultation requests yet</h3>
            <p className="text-gray-500">Consultation bookings will appear here once users submit them.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
