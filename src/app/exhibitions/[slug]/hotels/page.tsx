"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { getExhibitionById } from "@/lib/exhibitions";
import { getHotelsForExhibition, createHotelBooking, type Hotel } from "@/lib/hotels";
import { useAuth } from "@/lib/auth-context";

export default function HotelsPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const expo = getExhibitionById(slug);
  const { user } = useAuth();
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [rooms, setRooms] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  const hotels = useMemo(() => {
    if (!expo) return [];
    return getHotelsForExhibition(expo.id);
  }, [expo]);

  if (!expo) {
    return (
      <main className="flex min-h-[calc(100vh-52px)] items-center justify-center">
        <p className="text-gray-500">Exhibition not found.</p>
      </main>
    );
  }

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotel || !checkIn || !checkOut || !user) return;

    createHotelBooking({
      hotelId: selectedHotel.id,
      hotelName: selectedHotel.name,
      exhibitionId: expo.id,
      userId: user.id,
      userName: user.name || user.email,
      checkIn,
      checkOut,
      rooms,
    });

    setSubmitted(true);
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href={`/exhibitions/${slug}`}
        className="text-sm text-gray-500 hover:underline"
      >
        ← Back to {expo.title}
      </Link>

      <h1 className="mt-4 text-2xl font-bold">Hotel Reservation</h1>
      <p className="mt-1 text-sm text-gray-500">
        Curated hotels near {expo.venue} with negotiated rates for exhibitors and buyers.
      </p>

      {hotels.length === 0 ? (
        <div className="mt-12 py-16 text-center text-gray-400">
          No hotels listed for this exhibition yet.
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {hotels.map((hotel) => (
            <div
              key={hotel.id}
              className={`rounded-lg border p-5 transition ${
                selectedHotel?.id === hotel.id
                  ? "border-black ring-2 ring-black"
                  : "border-gray-200 hover:shadow-md"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{hotel.name}</h2>
                  <div className="mt-1 flex items-center gap-1 text-sm text-yellow-500">
                    {"★".repeat(hotel.stars)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold">${hotel.pricePerNight}</span>
                  <span className="text-xs text-gray-400"> / night</span>
                </div>
              </div>

              <p className="mt-2 text-sm text-gray-500">{hotel.address}</p>
              <p className="text-xs text-gray-400">{hotel.distanceToVenue}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {hotel.amenities.map((a) => (
                  <span
                    key={a}
                    className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                  >
                    {a}
                  </span>
                ))}
              </div>

              <button
                onClick={() => setSelectedHotel(selectedHotel?.id === hotel.id ? null : hotel)}
                className={`mt-4 w-full rounded py-2 text-sm font-medium transition ${
                  selectedHotel?.id === hotel.id
                    ? "bg-black text-white"
                    : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {selectedHotel?.id === hotel.id ? "Selected" : "Select Hotel"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Booking form */}
      {selectedHotel && (
        <div className="mt-8 rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold">
            Book {selectedHotel.name}
          </h2>

          {submitted ? (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-center text-sm text-green-700">
              ✅ Hotel booking request submitted! We&apos;ll confirm within 24 hours.
            </div>
          ) : user ? (
            <form onSubmit={handleBook} className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500">Check-in</label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Check-out</label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Rooms</label>
                <select
                  value={rooms}
                  onChange={(e) => setRooms(Number(e.target.value))}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} room{n > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <button
                  type="submit"
                  className="rounded bg-black px-6 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Submit Booking Request
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4">
              <Link
                href="/login"
                className="text-sm font-medium text-black hover:underline"
              >
                Log in to book →
              </Link>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
