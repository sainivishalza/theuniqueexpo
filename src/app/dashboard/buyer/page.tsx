"use client";

import Link from "next/link";
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
        <Card
          title="Browse Exhibitions"
          description="Discover upcoming trade shows"
          href="/exhibitions"
        />
        <Card
          title="Exhibitor Directory"
          description="Search verified suppliers"
          href="/directory"
        />
        <Card
          title="Post Buy Request"
          description="Post an RFQ for suppliers"
          href="/marketplace/new"
        />
        <Card
          title="Marketplace"
          description="View open RFQs and quotes"
          href="/marketplace"
        />
        <Card
          title="Saved Suppliers"
          description="Your bookmarked exhibitors"
          comingSoon
        />
        <Card
          title="Meetings"
          description="Upcoming meeting requests"
          comingSoon
        />
      </div>
    </main>
  );
}

function Card({
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
