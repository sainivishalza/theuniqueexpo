"use client";

import Logo from "@/components/Logo";
import NavDropdown from "@/components/NavDropdown";
import Button from "@/components/ui/Button";

import { Link } from "@/i18n/navigation";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// Thin gold underline on hover/focus instead of a filled hover pill --
// matches the dropdown triggers in NavDropdown.tsx so every top-level nav
// item (plain link or dropdown) reads as one consistent masthead style.
const NAV_LINK_CLASS =
  "py-2 text-sm font-medium text-gray-600 border-b-2 border-transparent hover:text-emerald-900 hover:border-gold-500 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 whitespace-nowrap shrink-0";

// Secondary items that exist but shouldn't outrank Exhibitions/Business
// Tours/Partner With Us -- grouped behind one "More" trigger instead of
// sitting at the top level (see section 1 of the site restructure brief).
function MoreMenu({ label, items }: { label: string; items: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function handleLeave() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  return (
    <div className="relative shrink-0" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        type="button"
        className={`flex items-center gap-1 ${NAV_LINK_CLASS}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full pt-2 w-52 z-50">
          <div className="rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card-lg)] border border-gray-200 py-2">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-4 py-2.5 text-sm text-gray-600 hover:bg-cream-50 hover:text-emerald-900 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:-outline-offset-2"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NavBar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroupOpen, setMobileGroupOpen] = useState<string | null>(null);
  const t = useTranslations("nav");

  const exhibitionsItems = [
    { label: t("exhibitionsMenu.calendar"), href: "/exhibitions" },
    { label: t("exhibitionsMenu.participation"), href: "/register" },
    { label: t("exhibitionsMenu.pastExhibitions"), href: "/exhibitions?view=past" },
  ];
  const chinaToursItems = [
    { label: t("toursMenu.tourRoutes"), href: "/tours" },
    { label: t("toursMenu.howToBook"), href: "/tours#how-to-book" },
    { label: t("toursMenu.reviews"), href: "/tours#reviews" },
  ];
  // Demoted secondary items -- still reachable, just not competing with the
  // primary Exhibitions/Business Tours/China Tours/Partner With Us items.
  const moreItems = [
    { label: t("events"), href: "/events" },
    { label: t("relocation"), href: "/relocation" },
    { label: t("blog"), href: "/blog" },
    { label: t("directory"), href: "/directory" },
    { label: t("marketplace"), href: "/marketplace" },
  ];

  // Primary nav groups (used for the mobile accordion) plus the flat
  // secondary items, in the exact order the mobile menu should list them.
  const navGroups = [
    { key: "exhibitions", label: t("exhibitions"), href: "/exhibitions", items: exhibitionsItems },
    { key: "chinaTours", label: t("chinaTours"), href: "/tours", items: chinaToursItems },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between gap-4 h-16">
        {/* Logo */}
        <Link href="/" className="group shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-4 rounded-sm">
          <Logo />
        </Link>

        {/* Desktop nav -- kicks in at a custom 1400px, not the xl (1280px)
            default: there are too many primary items (8 links/dropdowns + 2
            CTA buttons + auth) to fit cleanly below that, especially once
            Russian labels (which run longer than English/Chinese) are
            accounted for. The mobile menu handles anything narrower well. */}
        <div className="hidden min-[1400px]:flex items-center gap-1.5 2xl:gap-4">
          <Link href="/" className={NAV_LINK_CLASS}>
            {t("home")}
          </Link>
          <NavDropdown label={t("exhibitions")} href="/exhibitions" items={exhibitionsItems} />
          <Link href="/business-tours" className={NAV_LINK_CLASS}>
            {t("businessTours")}
          </Link>
          <NavDropdown label={t("chinaTours")} href="/tours" items={chinaToursItems} />
          <Link href="/services" className={NAV_LINK_CLASS}>
            {t("services")}
          </Link>
          <Link href="/about" className={NAV_LINK_CLASS}>
            {t("about")}
          </Link>
          <Link href="/contact" className={NAV_LINK_CLASS}>
            {t("contact")}
          </Link>
          <MoreMenu label={t("more")} items={moreItems} />
          <Button href="/plan-business-trip" variant="secondaryOutline" size="xs">
            {t("planABusinessTrip")}
          </Button>
          <Button href="/partner-with-us" variant="gold" size="xs">
            {t("partnerWithUs")}
          </Button>
          {user ? (
            <>
              <Link href="/messages" className={NAV_LINK_CLASS}>
                {t("messages")}
              </Link>
              <Link href="/dashboard" className={NAV_LINK_CLASS}>
                {t("dashboard")}
              </Link>
              <div className="flex items-center gap-2 ml-1 shrink-0">
                <div className="w-8 h-8 rounded-full bg-emerald-900 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {user.email?.[0]?.toUpperCase() || "U"}
                </div>
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-red-600 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2 rounded-sm whitespace-nowrap shrink-0"
                >
                  {t("logout")}
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className={NAV_LINK_CLASS}>
                {t("login")}
              </Link>
              <Button href="/register" variant="primary" size="xs">
                {t("register")}
              </Button>
            </>
          )}
          <LanguageSwitcher />
        </div>

        {/* Mobile hamburger */}
        <button
          className="min-[1400px]:hidden p-2 text-gray-600 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 rounded-sm"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-menu"
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
        <div id="mobile-nav-menu" className="lg:hidden border-t border-gray-200 bg-white px-6 py-4 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="pb-3 mb-2 border-b border-gray-100 space-y-2">
            <Button href="/plan-business-trip" variant="secondaryOutline" size="blockSm" onClick={() => setMobileOpen(false)}>
              {t("planABusinessTrip")}
            </Button>
            <Button href="/partner-with-us" variant="gold" size="blockSm" onClick={() => setMobileOpen(false)}>
              {t("partnerWithUs")}
            </Button>
          </div>
          <Link href="/" className="block py-2.5 text-sm font-medium text-gray-700 hover:text-emerald-900" onClick={() => setMobileOpen(false)}>{t("home")}</Link>
          {navGroups.map((group) => (
            <div key={group.key} className="border-b border-gray-100 last:border-0">
              <div className="flex items-center justify-between">
                <Link
                  href={group.href}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-700 hover:text-emerald-900"
                  onClick={() => setMobileOpen(false)}
                >
                  {group.label}
                </Link>
                <button
                  aria-label={group.label}
                  onClick={() => setMobileGroupOpen((k) => (k === group.key ? null : group.key))}
                  className="p-2.5 text-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 rounded-sm"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${mobileGroupOpen === group.key ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              {mobileGroupOpen === group.key && (
                <div className="pb-2 pl-4 space-y-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block py-2 text-sm text-gray-500 hover:text-emerald-900"
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <Link href="/business-tours" className="block py-2.5 text-sm font-medium text-gray-700 hover:text-emerald-900" onClick={() => setMobileOpen(false)}>{t("businessTours")}</Link>
          <Link href="/services" className="block py-2.5 text-sm font-medium text-gray-700 hover:text-emerald-900" onClick={() => setMobileOpen(false)}>{t("services")}</Link>
          <Link href="/about" className="block py-2.5 text-sm font-medium text-gray-700 hover:text-emerald-900" onClick={() => setMobileOpen(false)}>{t("about")}</Link>
          <Link href="/contact" className="block py-2.5 text-sm font-medium text-gray-700 hover:text-emerald-900" onClick={() => setMobileOpen(false)}>{t("contact")}</Link>

          <div className="pt-2 mt-2 border-t border-gray-100">
            <p className="px-0 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">{t("more")}</p>
            {moreItems.map((item) => (
              <Link key={item.href} href={item.href} className="block py-2 text-sm text-gray-500 hover:text-emerald-900" onClick={() => setMobileOpen(false)}>
                {item.label}
              </Link>
            ))}
          </div>

          {user ? (
            <div className="pt-2 border-t border-gray-100">
              <Link href="/messages" className="block py-2.5 text-sm font-medium text-gray-700 hover:text-emerald-900" onClick={() => setMobileOpen(false)}>{t("messages")}</Link>
              <Link href="/dashboard" className="block py-2.5 text-sm font-medium text-gray-700 hover:text-emerald-900" onClick={() => setMobileOpen(false)}>{t("dashboard")}</Link>
              <button onClick={() => { logout(); setMobileOpen(false); }} className="block py-2.5 text-sm font-medium text-red-500 hover:text-red-700">{t("logout")}</button>
            </div>
          ) : (
            <div className="pt-2 border-t border-gray-100">
              <Link href="/login" className="block py-2.5 text-sm font-medium text-gray-700 hover:text-emerald-900" onClick={() => setMobileOpen(false)}>{t("login")}</Link>
              <div className="pt-2">
                <Button href="/register" variant="primary" size="blockSm" onClick={() => setMobileOpen(false)}>{t("register")}</Button>
              </div>
            </div>
          )}
          <div className="pt-2 border-t border-gray-100">
            <LanguageSwitcher mobile />
          </div>
        </div>
      )}
    </nav>
  );
}
