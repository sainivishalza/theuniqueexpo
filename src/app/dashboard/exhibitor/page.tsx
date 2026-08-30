"use client";

import { useAuth } from "@/lib/auth-context";

export default function ExhibitorDashboard() {
  const { user } = useAuth();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Exhibitor Dashboard</h1>
        <p className="mt-1 text-gray-500">
          Welcome back{user?.name ? `, ${user.name}` : ""}. Manage your booth, profile, and leads.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Book a Booth" description="Select and pay for booth space" />
        <Card title="My Booths" description="Manage your current bookings" />
        <Card title="Company Profile" description="Build your exhibitor microsite" />
        <Card title="Leads & CRM" description="View captured leads" />
        <Card title="RFQ Alerts" description="Buyer requests matching your category" />
        <Card title="Messages" description="Conversations with buyers" />
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
