"use client";

import { useAuth } from "@/lib/auth-context";

export default function VisitorDashboard() {
  const { user } = useAuth();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Visitor Dashboard</h1>
        <p className="mt-1 text-gray-500">
          Welcome back{user?.name ? `, ${user.name}` : ""}. Explore exhibitions, plan your visit, and network.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Browse Exhibitions" description="Upcoming events near you" />
        <Card title="Visit Planner" description="Build your show-day itinerary" />
        <Card title="Saved Exhibitors" description="Your bookmarked profiles" />
        <Card title="My Registrations" description="Events you're attending" />
        <Card title="Messages" description="Conversations with exhibitors" />
        <Card title="Content" description="Magazine articles and videos" />
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
