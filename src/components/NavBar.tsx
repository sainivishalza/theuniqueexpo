"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function NavBar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-200/60">
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center text-white text-sm font-bold shadow-sm">
            E
          </div>
          <span className="text-xl font-extrabold tracking-tight text-gray-900">
            Expo<span className="text-blue-600">Bridge</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <Link
            href="/exhibitions"
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-colors"
          >
            Exhibitions
          </Link>
          <Link
            href="/directory"
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-colors"
          >
            Directory
          </Link>
          <Link
            href="/marketplace"
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-colors"
          >
            Marketplace
          </Link>
          {user ? (
            <>
              <div className="w-px h-5 bg-gray-200 mx-1" />
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-colors"
              >
                Dashboard
              </Link>
              <div className="flex items-center gap-2 ml-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                  {user.email?.[0]?.toUpperCase() || "U"}
                </div>
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-px h-5 bg-gray-200 mx-1" />
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="ml-1 px-5 py-2.5 text-sm font-semibold text-white gradient-brand rounded-xl shadow-sm shadow-blue-500/25 hover:shadow-md hover:shadow-blue-500/30 hover:scale-105 transition-all duration-200"
              >
                Register
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-gray-600 hover:text-gray-900"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200/60 bg-white/95 backdrop-blur-xl px-6 py-4 space-y-2">
          <Link href="/exhibitions" className="block py-2.5 text-sm font-medium text-gray-700 hover:text-blue-600" onClick={() => setMobileOpen(false)}>Exhibitions</Link>
          <Link href="/directory" className="block py-2.5 text-sm font-medium text-gray-700 hover:text-blue-600" onClick={() => setMobileOpen(false)}>Directory</Link>
          <Link href="/marketplace" className="block py-2.5 text-sm font-medium text-gray-700 hover:text-blue-600" onClick={() => setMobileOpen(false)}>Marketplace</Link>
          {user ? (
            <>
              <Link href="/dashboard" className="block py-2.5 text-sm font-medium text-gray-700 hover:text-blue-600" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              <button onClick={() => { logout(); setMobileOpen(false); }} className="block py-2.5 text-sm font-medium text-red-500 hover:text-red-700">Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className="block py-2.5 text-sm font-medium text-gray-700 hover:text-blue-600" onClick={() => setMobileOpen(false)}>Login</Link>
              <Link href="/register" className="block py-2.5 text-sm font-semibold text-blue-600" onClick={() => setMobileOpen(false)}>Register →</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
