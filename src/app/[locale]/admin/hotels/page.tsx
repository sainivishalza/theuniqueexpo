"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@/i18n/navigation";

interface Booking {
  id: string;
  hotelName: string;
  userName: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  status: string;
}

export default function AdminHotelsPage() {
  const t = useTranslations("adminHotels");
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch("/api/admin/hotel-bookings")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setBookings(data.bookings);
      })
      .catch((err) => setError(err.message || t("loadFailed")))
      .finally(() => setLoading(false));
  }, [user]);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/hotel-bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error || t("updateFailed"));
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  if (authLoading) return null;

  if (!user || user.role !== "admin") {
    return (
      <main className="flex min-h-[calc(100vh-52px)] items-center justify-center">
        <p className="text-gray-500">{t("accessDenied")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        {t("backToAdmin")}
      </Link>

      <h1 className="mt-4 text-2xl font-bold">{t("title")}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {t("subtitle")}
      </p>

      {loading && <p className="mt-12 text-center text-gray-400">{t("loading")}</p>}
      {error && <p className="mt-12 text-center text-red-600">{error}</p>}

      {!loading && !error && bookings.length === 0 ? (
        <div className="mt-12 py-16 text-center text-gray-400">
          {t("noResults")}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {bookings.map((bk) => (
            <div
              key={bk.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-gray-200 p-4"
            >
              <div className="min-w-0">
                <h2 className="font-semibold">{bk.hotelName}</h2>
                <p className="text-sm text-gray-500">
                  {t("bookingSummary", { user: bk.userName, checkIn: bk.checkIn, checkOut: bk.checkOut, rooms: bk.rooms })}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    bk.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : bk.status === "confirmed"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {t(`statuses.${bk.status}`)}
                </span>
                {bk.status === "pending" && (
                  <>
                    <button
                      onClick={() => updateStatus(bk.id, "confirmed")}
                      disabled={updatingId === bk.id}
                      className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {t("confirm")}
                    </button>
                    <button
                      onClick={() => updateStatus(bk.id, "cancelled")}
                      disabled={updatingId === bk.id}
                      className="rounded bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
                    >
                      {t("cancel")}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
