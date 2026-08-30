"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getBookingsForExhibitor } from "@/lib/booths";

export default function ExhibitorDashboard() {
  const { user } = useAuth();
  const bookings = user ? getBookingsForExhibitor(user.id) : [];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Exhibitor Dashboard</h1>
        <p className="mt-1 text-gray-500">
          Welcome back{user?.name ? `, ${user.name}` : ""}. Manage your booth, profile, and leads.
        </p>
      </div>

      {/* Quick actions */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/exhibitions"
          className="rounded-lg border border-gray-200 p-5 transition hover:shadow-md"
        >
          <h2 className="font-semibold">Book a Booth</h2>
          <p className="mt-1 text-sm text-gray-500">Browse exhibitions and select booth space</p>
        </Link>
        <Link
          href="/exhibitor/ex-1"
          className="rounded-lg border border-gray-200 p-5 transition hover:shadow-md"
        >
          <h2 className="font-semibold">Company Profile</h2>
          <p className="mt-1 text-sm text-gray-500">Build your exhibitor microsite</p>
        </Link>
        <div className="rounded-lg border border-gray-200 p-5 transition hover:shadow-md">
          <h2 className="font-semibold">Leads & CRM</h2>
          <p className="mt-1 text-sm text-gray-500">View captured leads</p>
          <span className="mt-3 inline-block text-xs font-medium text-gray-400">Coming soon</span>
        </div>
      </div>

      {/* Bookings */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">My Booth Bookings</h2>
        {bookings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <p className="text-gray-400">No bookings yet.</p>
            <Link
              href="/exhibitions"
              className="mt-3 inline-block text-sm font-medium text-black hover:underline"
            >
              Browse exhibitions →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((bk) => (
              <div
                key={bk.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
              >
                <div>
                  <p className="font-medium">Booth {bk.boothId.split("-").pop()}</p>
                  <p className="text-sm text-gray-500">
                    {bk.exhibitionId} • Booked {new Date(bk.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      bk.status === "confirmed"
                        ? "bg-green-100 text-green-700"
                        : bk.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {bk.status}
                  </span>
                  <p className="mt-1 text-sm font-medium">${bk.amount.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
