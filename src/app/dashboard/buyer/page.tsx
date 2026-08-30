"use client";

import { useAuth } from "@/lib/auth-context";

export default function BuyerDashboard() {
  const { user } = useAuth();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Buyer Dashboard</h1>
        <p className="mt-1 text-gray-500">
          Welcome back{user?.name ? `, ${user.name}` : ""}. Find suppliers, post RFQs, and manage your sourcing.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Browse Exhibitions" description="Discover upcoming trade shows" />
        <Card title="Exhibitor Directory" description="Search verified suppliers" />
        <Card title="My RFQs" description="Post and track buy requests" />
        <Card title="Saved Suppliers" description="Your bookmarked exhibitors" />
        <Card title="Meetings" description="Upcoming meeting requests" />
        <Card title="Messages" description="Conversations with exhibitors" />
      </div>
    </main>
  );
}

function Card({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-5 transition hover:shadow-md">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      <div className="mt-4">
        <span className="text-xs font-medium text-gray-400">Coming soon</span>
      </div>
    </div>
  );
}
