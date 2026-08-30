"use client";

import { useAuth } from "@/lib/auth-context";

export default function PartnerDashboard() {
  const { user } = useAuth();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Partner Dashboard</h1>
        <p className="mt-1 text-gray-500">
          Welcome back{user?.name ? `, ${user.name}` : ""}. Track referrals, commissions, and performance.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="My Referral Link" description="Share and track signups" />
        <Card title="Referred Users" description="People who signed up through you" />
        <Card title="Commissions" description="Earnings and payout status" />
        <Card title="Marketing Kit" description="Banners, brochures, pitch decks" />
        <Card title="Performance" description="Conversion and click analytics" />
        <Card title="Messages" description="Communicate with the team" />
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
