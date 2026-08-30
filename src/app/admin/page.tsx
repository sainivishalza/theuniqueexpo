"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { exhibitions } from "@/lib/exhibitions";
import { getRFQs } from "@/lib/rfq";
import { getAllHotelBookings } from "@/lib/hotels";

export default function AdminPage() {
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    return (
      <main className="flex min-h-[calc(100vh-52px)] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl">🔒</div>
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-gray-500">You need admin privileges to view this page.</p>
          <p className="text-xs text-gray-400">
            Tip: register with email "admin@expobridge.com" to get admin access.
          </p>
          <Link href="/" className="text-sm font-medium text-black hover:underline">
            Go home →
          </Link>
        </div>
      </main>
    );
  }

  const rfqs = getRFQs();
  const hotelBookings = getAllHotelBookings();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Admin Back Office</h1>
        <p className="mt-1 text-gray-500">
          Manage exhibitions, bookings, RFQs, and user listings.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Exhibitions" value={exhibitions.length} icon="🎪" />
        <StatCard label="Open RFQs" value={rfqs.filter((r) => r.status === "open").length} icon="📋" />
        <StatCard label="Hotel Bookings" value={hotelBookings.length} icon="🏨" />
        <StatCard label="Total RFQs" value={rfqs.length} icon="📊" />
      </div>

      {/* Management sections */}
      <div className="grid gap-6 sm:grid-cols-2">
        <AdminCard
          title="Exhibition Management"
          description="Create, edit, and manage exhibition listings, floor plans, and booth inventory."
          href="/admin/exhibitions"
        />
        <AdminCard
          title="RFQ Review"
          description="View and moderate all buy requests and submitted quotes."
          href="/admin/rfqs"
        />
        <AdminCard
          title="Hotel Bookings"
          description="Review and confirm hotel booking requests from buyers."
          href="/admin/hotels"
        />
        <AdminCard
          title="User Management"
          description="Manage user accounts, roles, and verification status."
          comingSoon
        />
      </div>
    </main>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="mt-2 text-sm text-gray-500">{label}</p>
    </div>
  );
}

function AdminCard({
  title,
  description,
  href,
  comingSoon,
}: {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
}) {
  if (href) {
    return (
      <Link
        href={href}
        className="rounded-lg border border-gray-200 p-5 transition hover:shadow-md"
      >
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </Link>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 p-5 transition hover:shadow-md">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      {comingSoon && (
        <span className="mt-3 inline-block text-xs font-medium text-gray-400">Coming soon</span>
      )}
    </div>
  );
}
