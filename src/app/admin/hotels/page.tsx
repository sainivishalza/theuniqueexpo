"use client";

import { useAuth } from "@/lib/auth-context";
import { getAllHotelBookings } from "@/lib/hotels";
import Link from "next/link";

export default function AdminHotelsPage() {
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    return (
      <main className="flex min-h-[calc(100vh-52px)] items-center justify-center">
        <p className="text-gray-500">Access denied. Admin only.</p>
      </main>
    );
  }

  const bookings = getAllHotelBookings();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        ← Back to admin
      </Link>

      <h1 className="mt-4 text-2xl font-bold">Hotel Booking Review</h1>
      <p className="mt-1 text-sm text-gray-500">
        Review and manage hotel booking requests.
      </p>

      {bookings.length === 0 ? (
        <div className="mt-12 py-16 text-center text-gray-400">
          No hotel bookings yet.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {bookings.map((bk) => (
            <div
              key={bk.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
            >
              <div>
                <h2 className="font-semibold">{bk.hotelName}</h2>
                <p className="text-sm text-gray-500">
                  {bk.userName} • {bk.checkIn} to {bk.checkOut} • {bk.rooms} room(s)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    bk.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : bk.status === "confirmed"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {bk.status}
                </span>
                {bk.status === "pending" && (
                  <button className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700">
                    Confirm
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
