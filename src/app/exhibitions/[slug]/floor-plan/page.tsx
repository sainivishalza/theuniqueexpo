"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { getExhibitionById } from "@/lib/exhibitions";
import { initBooths, type Booth } from "@/lib/booths";
import { useAuth } from "@/lib/auth-context";

const SIZE_COLORS: Record<string, string> = {
  platinum: "bg-yellow-400 hover:bg-yellow-300",
  gold: "bg-blue-400 hover:bg-blue-300",
  standard: "bg-green-400 hover:bg-green-300",
};

const SIZE_LABELS: Record<string, string> = {
  platinum: "Platinum — $15,000",
  gold: "Gold — $8,000",
  standard: "Standard — $3,500",
};

export default function FloorPlanPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const expo = getExhibitionById(slug);
  const { user } = useAuth();
  const [selected, setSelected] = useState<Booth | null>(null);

  const booths = useMemo(() => {
    if (!expo) return [];
    return initBooths(expo.id);
  }, [expo]);

  if (!expo) {
    return (
      <main className="flex min-h-[calc(100vh-52px)] items-center justify-center">
        <p className="text-gray-500">Exhibition not found.</p>
      </main>
    );
  }

  const rows = ["A", "B", "C", "D", "E"];
  const cols = 8;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href={`/exhibitions/${slug}`}
        className="text-sm text-gray-500 hover:underline"
      >
        ← Back to {expo.title}
      </Link>

      <h1 className="mt-4 text-2xl font-bold">Floor Plan — Booth Selection</h1>
      <p className="mt-1 text-sm text-gray-500">
        Click an available booth to select and book it.
      </p>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-xs">
        {Object.entries(SIZE_LABELS).map(([size, label]) => (
          <div key={size} className="flex items-center gap-1.5">
            <span className={`inline-block h-4 w-4 rounded ${SIZE_COLORS[size].split(" ")[0]}`} />
            {label}
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-4 rounded bg-red-400" />
          Booked
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-4 rounded bg-gray-600" />
          Selected
        </div>
      </div>

      {/* Floor plan grid */}
      <div className="mt-6 overflow-x-auto">
        <div className="inline-block min-w-[600px]">
          {/* Column headers */}
          <div className="mb-2 flex">
            <div className="w-10" />
            {Array.from({ length: cols }, (_, i) => (
              <div
                key={i}
                className="flex h-8 w-16 items-center justify-center text-xs font-medium text-gray-400"
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Rows */}
          {rows.map((row) => (
            <div key={row} className="mb-2 flex items-center">
              <div className="w-10 text-center text-sm font-bold text-gray-500">
                {row}
              </div>
              {Array.from({ length: cols }, (_, i) => {
                const booth = booths.find(
                  (b) => b.row === row && b.col === i + 1
                );
                if (!booth) return <div key={i} className="h-14 w-16" />;

                const isBooked = booth.status === "booked";
                const isSelected = selected?.id === booth.id;

                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (!isBooked) setSelected(isSelected ? null : booth);
                    }}
                    disabled={isBooked}
                    title={
                      isBooked
                        ? `Booked: ${booth.exhibitorName}`
                        : `${booth.size} — $${booth.price.toLocaleString()}`
                    }
                    className={`mr-2 flex h-14 w-16 flex-col items-center justify-center rounded border text-[10px] font-medium transition ${
                      isSelected
                        ? "border-white bg-gray-600 text-white ring-2 ring-white"
                        : isBooked
                          ? "cursor-not-allowed border-red-500/30 bg-red-400/80 text-red-900"
                          : `${SIZE_COLORS[booth.size]} border-transparent text-gray-900`
                    }`}
                  >
                    <span>{row}{i + 1}</span>
                    {isBooked ? (
                      <span className="mt-0.5 text-[8px] opacity-70">Booked</span>
                    ) : (
                      <span className="mt-0.5 text-[8px] opacity-70">
                        ${booth.price >= 1000 ? `${booth.price / 1000}k` : booth.price}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Stage */}
          <div className="mt-4 flex justify-center">
            <div className="flex h-12 w-96 items-center justify-center rounded bg-gray-800 text-xs font-medium text-gray-400">
              🎤 STAGE
            </div>
          </div>
        </div>
      </div>

      {/* Selection panel */}
      {selected && (
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-md">
          <h2 className="text-lg font-bold">Selected Booth: {selected.row}{selected.col}</h2>
          <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Size</span>
              <p className="font-medium capitalize">{selected.size}</p>
            </div>
            <div>
              <span className="text-gray-400">Price</span>
              <p className="font-medium">${selected.price.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-gray-400">Status</span>
              <p className="font-medium capitalize text-green-600">Available</p>
            </div>
          </div>

          {user?.role === "exhibitor" ? (
            <Link
              href={`/exhibitions/${slug}/book/${selected.id}`}
              className="mt-4 inline-block rounded bg-black px-6 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Book This Booth — ${selected.price.toLocaleString()}
            </Link>
          ) : (
            <div className="mt-4">
              <Link
                href="/register"
                className="inline-block rounded bg-black px-6 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Register as Exhibitor to Book
              </Link>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
