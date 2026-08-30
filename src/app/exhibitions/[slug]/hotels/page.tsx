"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

interface Exhibition {
  id: string; slug: string; title: string; city: string;
}

interface Hotel {
  id: string; name: string; stars: number; address: string; city: string;
  pricePerNight: number; distanceToVenue: string; amenities: string[];
}

const hotelImages = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=300&fit=crop&q=80",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&h=300&fit=crop&q=80",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&h=300&fit=crop&q=80",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&h=300&fit=crop&q=80",
  "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=600&h=300&fit=crop&q=80",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&h=300&fit=crop&q=80",
];

export default function HotelsPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { user } = useAuth();
  const [expo, setExpo] = useState<Exhibition | null | undefined>(undefined);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [rooms, setRooms] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/exhibitions/${slug}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setExpo(data.exhibition))
      .catch(() => setExpo(null));
  }, [slug]);

  useEffect(() => {
    if (!expo) return;
    fetch(`/api/hotels?exhibitionId=${expo.id}`)
      .then((res) => res.json())
      .then((data) => setHotels(data.hotels || []));
  }, [expo]);

  if (expo === undefined) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-400">Loading...</div>;
  }

  if (!expo) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-500">Exhibition not found.</p>
      </div>
    );
  }

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotel || !checkIn || !checkOut || !user) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/hotel-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId: Number(selectedHotel.id),
          exhibitionId: Number(expo.id),
          checkIn,
          checkOut,
          rooms,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Booking failed");
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative h-56 bg-gray-900 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1400&h=300&fit=crop&q=80"
          alt=""
          className="img-cover opacity-40"
        />
        <div className="absolute inset-0 gradient-overlay" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto max-w-7xl px-6 pb-6 w-full">
            <Link href={`/exhibitions/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back to {expo.title}
            </Link>
            <h1 className="text-3xl font-extrabold text-white">Hotels Near {expo.city}</h1>
            <p className="mt-1 text-gray-300">Curated hotels with negotiated rates for attendees.</p>
          </div>
        </div>
      </section>

      <section className="py-10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          {hotels.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🏨</div>
              <h3 className="text-xl font-bold text-gray-900">No hotels listed yet</h3>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {hotels.map((hotel, idx) => (
                <div
                  key={hotel.id}
                  className={`rounded-2xl bg-white shadow-sm border-2 overflow-hidden card-hover transition-all ${
                    selectedHotel?.id === hotel.id ? "border-blue-500 shadow-md shadow-blue-500/10" : "border-gray-100"
                  }`}
                >
                  <div className="relative h-40 overflow-hidden">
                    <img src={hotelImages[idx % hotelImages.length]} alt={hotel.name} className="img-cover" />
                    <div className="absolute top-3 right-3 rounded-lg bg-white/90 backdrop-blur-sm px-3 py-1 shadow-sm">
                      <span className="text-lg font-extrabold text-gray-900">${hotel.pricePerNight}</span>
                      <span className="text-xs text-gray-500">/night</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-bold text-gray-900">{hotel.name}</h2>
                      <div className="text-amber-400 text-xs">{"★".repeat(hotel.stars)}</div>
                    </div>
                    <p className="text-sm text-gray-500">{hotel.address}</p>
                    <p className="text-xs text-gray-400 mt-1">📍 {hotel.distanceToVenue}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {hotel.amenities.slice(0, 4).map((a) => (
                        <span key={a} className="rounded-lg bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{a}</span>
                      ))}
                    </div>
                    <button
                      onClick={() => setSelectedHotel(selectedHotel?.id === hotel.id ? null : hotel)}
                      className={`mt-4 w-full rounded-xl py-2.5 text-sm font-semibold transition-all ${
                        selectedHotel?.id === hotel.id
                          ? "gradient-brand text-white shadow-md shadow-blue-500/25"
                          : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {selectedHotel?.id === hotel.id ? "✓ Selected" : "Select Hotel"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Booking form */}
          {selectedHotel && (
            <div className="mt-10 rounded-2xl bg-white p-8 shadow-sm border border-gray-100 max-w-2xl mx-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-5">Book {selectedHotel.name}</h2>
              {submitted ? (
                <div className="rounded-xl bg-green-50 border border-green-200 p-6 text-center">
                  <div className="text-4xl mb-3">✅</div>
                  <h3 className="font-bold text-green-800">Booking Request Submitted!</h3>
                  <p className="text-sm text-green-600 mt-1">We&apos;ll confirm within 24 hours.</p>
                </div>
              ) : user ? (
                <form onSubmit={handleBook} className="space-y-4">
                  {error && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Check-in</label>
                      <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 outline-none" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Check-out</label>
                      <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 outline-none" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Rooms</label>
                      <select value={rooms} onChange={(e) => setRooms(Number(e.target.value))} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 outline-none">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>{n} room{n > 1 ? "s" : ""}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={submitting} className="w-full rounded-xl gradient-brand py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/25 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50">
                    {submitting ? "Submitting..." : "Submit Booking Request"}
                  </button>
                </form>
              ) : (
                <Link href="/login" className="text-sm font-semibold text-blue-600 hover:underline">Log in to book →</Link>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
