"use client";

import Logo from "@/components/Logo";

import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function NavBar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations("nav");

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-200/60">
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="group">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <Link
            href="/exhibitions"
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-colors"
          >
            {t("exhibitions")}
          </Link>
          <Link
            href="/directory"
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-colors"
          >
            {t("directory")}
          </Link>
          <Link
            href="/tours"
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-colors"
          >
            {t("tours")}
          </Link>
          <Link
            href="/marketplace"
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-colors"
          >
            {t("marketplace")}
          </Link>
          {user ? (
            <>
              <div className="w-px h-5 bg-gray-200 mx-1" />
              <Link
                href="/messages"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-colors"
              >
                {t("messages")}
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-colors"
              >
                {t("dashboard")}
              </Link>
              <div className="flex items-center gap-2 ml-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                  {user.email?.[0]?.toUpperCase() || "U"}
                </div>
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                >
                  {t("logout")}
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
                {t("login")}
              </Link>
              <Link
                href="/register"
                className="ml-1 px-5 py-2.5 text-sm font-semibold text-white gradient-brand rounded-xl shadow-sm shadow-emerald-500/25 hover:shadow-md hover:shadow-emerald-500/30 hover:scale-105 transition-all duration-200"
              >
                {t("register")}
              </Link>
            </>
          )}
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <LanguageSwitcher />
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
          <Link href="/exhibitions" className="block py-2.5 text-sm font-medium text-gray-700 hover:text-emerald-600" onClick={() => setMobileOpen(false)}>{t("exhibitions")}</Link>
          <Link href="/directory" className="block py-2.5 text-sm font-medium text-gray-700 hover:text-emerald-600" onClick={() => setMobileOpen(false)}>{t("directory")}</Link>
          <Link href="/tours" className="block py-2.5 text-sm font-medium text-gray-700 hover:text-emerald-600" onClick={() => setMobileOpen(false)}>{t("tours")}</Link>
          <Link href="/services" className="block py-2.5 text-sm font-medium text-gray-700 hover:text-emerald-600" onClick={() => setMobileOpen(false)}>{t("services")}</Link>
          <Link href="/marketplace" className="block py-2.5 text-sm font-medium text-gray-700 hover:text-emerald-600" onClick={() => setMobileOpen(false)}>{t("marketplace")}</Link>
          {user ? (
            <>
              <Link href="/messages" className="block py-2.5 text-sm font-medium text-gray-700 hover:text-emerald-600" onClick={() => setMobileOpen(false)}>{t("messages")}</Link>
              <Link href="/dashboard" className="block py-2.5 text-sm font-medium text-gray-700 hover:text-emerald-600" onClick={() => setMobileOpen(false)}>{t("dashboard")}</Link>
              <button onClick={() => { logout(); setMobileOpen(false); }} className="block py-2.5 text-sm font-medium text-red-500 hover:text-red-700">{t("logout")}</button>
            </>
          ) : (
            <>
              <Link href="/login" className="block py-2.5 text-sm font-medium text-gray-700 hover:text-emerald-600" onClick={() => setMobileOpen(false)}>{t("login")}</Link>
              <Link href="/register" className="block py-2.5 text-sm font-semibold text-emerald-600" onClick={() => setMobileOpen(false)}>{t("register")} →</Link>
            </>
          )}
          <div className="pt-2 border-t border-gray-100">
            <LanguageSwitcher mobile />
          </div>
        </div>
      )}
    </nav>
  );
}
