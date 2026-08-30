"use client";

import { useAuth } from "@/lib/auth-context";
import { exhibitions } from "@/lib/exhibitions";
import Link from "next/link";

export default function AdminExhibitionsPage() {
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    return (
      <main className="flex min-h-[calc(100vh-52px)] items-center justify-center">
        <p className="text-gray-500">Access denied. Admin only.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        ← Back to admin
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exhibition Management</h1>
        <button className="rounded bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-800">
          + New Exhibition
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {exhibitions.map((expo) => (
          <div
            key={expo.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center gap-4">
              <div
                className="h-10 w-10 rounded"
                style={{ backgroundColor: expo.color }}
              />
              <div>
                <h2 className="font-semibold">{expo.title}</h2>
                <p className="text-sm text-gray-500">
                  {expo.dates} • {expo.city}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/exhibitions/${expo.slug}`}
                className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                View
              </Link>
              <button className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
