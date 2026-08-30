"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
      <Link href="/" className="text-xl font-bold">
        ExpoBridge
      </Link>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Link href="/dashboard" className="text-sm text-gray-700 hover:text-black">
              Dashboard
            </Link>
            <span className="text-sm text-gray-500">{user.email}</span>
            <button
              onClick={logout}
              className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-sm text-gray-700 hover:text-black">
              Login
            </Link>
            <Link
              href="/register"
              className="rounded bg-black px-3 py-1 text-sm text-white hover:bg-gray-800"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
