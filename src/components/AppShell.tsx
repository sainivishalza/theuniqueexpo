"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useAuth } from "@/lib/auth-context";

export interface ShellItem {
  key: string;
  href: string;
  label: string;
  icon: string;
  /** Key of the group heading this item sits under (items without one come first). */
  group?: string;
  /** A number to show next to the label (how many requests are waiting); hidden when 0 or missing. */
  count?: number;
}

export interface ShellGroup {
  key: string;
  label: string;
}

interface Props {
  /** Small label above the page title: "Admin", "Buyer", ... */
  areaLabel: string;
  /** Pill shown next to it (the signed-in role). */
  badge: string;
  items: ShellItem[];
  groups?: ShellGroup[];
  /** The item that stands for the area's home page. */
  homeHref: string;
  searchPlaceholder?: string;
  /** Extra links offered while the visitor types (e.g. "Find buyer TUE0012"). */
  searchLinks?: (query: string) => ShellItem[];
  children: React.ReactNode;
}

const LANGUAGE_NAMES: Record<string, string> = { en: "English", ru: "Русский", zh: "中文" };

function isActive(pathname: string, href: string, homeHref: string): boolean {
  const path = href.split("?")[0];
  if (path === homeHref) return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}

// The frame around the admin and dashboard areas: a list of features down the left
// side on a laptop; on a phone a top bar that opens a full-screen menu with a search
// box and a two-column grid of buttons.
export default function AppShell({ areaLabel, badge, items, groups = [], homeHref, searchPlaceholder, searchLinks, children }: Props) {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // A new page was opened from the menu: close it and clear the search.
  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [pathname]);

  // While the full-screen menu is open the page behind it must not scroll; Escape closes it.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () => (q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items),
    [items, q]
  );
  const extra = q && searchLinks ? searchLinks(query.trim()) : [];

  const current = items.find((i) => isActive(pathname, i.href, homeHref));
  const sections: { group: ShellGroup | null; items: ShellItem[] }[] = [];
  const ungrouped = visible.filter((i) => !i.group);
  if (ungrouped.length) sections.push({ group: null, items: ungrouped });
  for (const g of groups) {
    const inGroup = visible.filter((i) => i.group === g.key);
    if (inGroup.length) sections.push({ group: g, items: inGroup });
  }

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  function switchLocale(next: string) {
    router.replace(pathname, { locale: next });
  }

  const search = (id: string) => (
    <div className="relative">
      <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
      </svg>
      <input
        id={id}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={searchPlaceholder || t("shell.searchSections")}
        aria-label={searchPlaceholder || t("shell.searchSections")}
        autoComplete="off"
        className="w-full rounded-xl border border-white/20 bg-white/10 py-2.5 pl-10 pr-3 text-sm text-white placeholder-white/55 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/40"
      />
    </div>
  );

  const roleBadge = <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-gold-300">{badge}</span>;

  const footer = (
    <div className="space-y-1 text-sm">
      {user?.email && <p className="truncate px-3 pb-1 text-xs text-white/60" title={user.email}>{user.email}</p>}
      <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium text-white/85 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400">
        <span aria-hidden="true" className="w-5 text-center">🌐</span>
        {t("shell.viewSite")}
      </Link>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2" role="group" aria-label={t("shell.language")}>
        {routing.locales.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => switchLocale(code)}
            aria-pressed={code === locale}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400 ${code === locale ? "bg-gold-400 text-emerald-950" : "bg-white/10 text-white/80 hover:bg-white/20"}`}
          >
            {LANGUAGE_NAMES[code] ?? code}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-medium text-red-200 hover:bg-white/10 hover:text-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400"
      >
        <span aria-hidden="true" className="w-5 text-center">↩️</span>
        {t("shell.logout")}
      </button>
    </div>
  );

  const resultLinks = extra.length > 0 && (
    <ul className="mb-3 space-y-1" aria-label={t("shell.searchResults")}>
      {extra.map((i) => (
        <li key={i.key}>
          <Link href={i.href} className="flex items-center gap-3 rounded-xl border border-gold-400/50 bg-gold-400/10 px-3 py-2.5 text-sm font-semibold text-gold-200 hover:bg-gold-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400">
            <span aria-hidden="true">{i.icon}</span>
            <span className="min-w-0 break-words">{i.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="app-shell min-h-screen bg-cream-50 [--color-hero-bg:var(--color-emerald-800)] lg:flex">
      {/* Laptop: a list of features down the left side */}
      <aside className="hidden shrink-0 flex-col bg-[var(--color-hero-bg)] text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:self-start xl:w-80">
        <div className="px-5 pb-3 pt-6">
          <Link href="/" className="flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl gradient-brand text-white" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-lg font-bold text-white">The Unique Expo</span>
          </Link>
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-white/70">{areaLabel}</span>
            {roleBadge}
          </div>
        </div>
        <div className="px-4">{search("shell-search-desktop")}</div>
        <nav className="mt-4 flex-1 overflow-y-auto px-3 pb-4" aria-label={areaLabel}>
          {resultLinks}
          {sections.map(({ group, items: list }) => (
            <div key={group?.key ?? "top"} className="mb-4">
              {group && <p className="px-3 pb-1.5 text-xs font-medium text-white/55">{group.label}</p>}
              <ul className="space-y-0.5">
                {list.map((item) => {
                  const active = isActive(pathname, item.href, homeHref);
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400 ${active ? "bg-white/15 text-white ring-1 ring-gold-400/70" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
                      >
                        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-base">{item.icon}</span>
                        <span className="min-w-0 leading-tight [overflow-wrap:anywhere]">{item.label}</span>
                        {item.count ? <span className="ml-auto shrink-0 rounded-full bg-gold-400 px-2 py-0.5 text-[11px] font-bold text-emerald-950" aria-label={t("shell.waiting", { count: item.count })}>{item.count}</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {q && sections.length === 0 && extra.length === 0 && (
            <p className="px-3 py-4 text-sm text-white/60">{t("shell.noMatches", { query: query.trim() })}</p>
          )}
        </nav>
        <div className="border-t border-white/10 p-3">{footer}</div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Phone: a top bar that opens the full-screen menu */}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[var(--color-hero-bg)] text-white lg:hidden">
          <div className="flex h-14 items-center gap-3 px-4">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setOpen(true)}
              aria-label={t("shell.openMenu")}
              aria-expanded={open}
              aria-controls="app-shell-menu"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-400/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium leading-none text-white/65">{areaLabel}</p>
              <p className="truncate pt-0.5 font-semibold leading-tight">{current?.label ?? t("shell.dashboard")}</p>
            </div>
            {roleBadge}
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="focus:outline-none">{children}</main>
      </div>

      {open && (
        <div id="app-shell-menu" role="dialog" aria-modal="true" aria-label={areaLabel} className="fixed inset-0 z-[60] overflow-y-auto bg-[var(--color-hero-bg)] text-white lg:hidden">
          <div className="mx-auto max-w-lg px-4 pb-10">
            <div className="sticky top-0 z-10 -mx-4 flex h-16 items-center gap-3 border-b border-white/10 bg-[var(--color-hero-bg)] px-4">
              <button
                ref={closeRef}
                type="button"
                onClick={() => {
                  setOpen(false);
                  menuButtonRef.current?.focus();
                }}
                aria-label={t("shell.closeMenu")}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-400/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium leading-none text-white/65">{areaLabel}</p>
                <p className="truncate pt-0.5 font-semibold leading-tight">{t("shell.dashboard")}</p>
              </div>
              {roleBadge}
            </div>

            <div className="pt-4">{search("shell-search-mobile")}</div>

            <nav className="mt-4" aria-label={areaLabel}>
              {resultLinks}
              {sections.map(({ group, items: list }) => (
                <div key={group?.key ?? "top"} className="mb-4">
                  {group && <p className="pb-2 pt-1 text-xs font-medium text-white/55">{group.label}</p>}
                  <ul className="grid grid-cols-2 gap-3">
                    {list.map((item) => {
                      const active = isActive(pathname, item.href, homeHref);
                      return (
                        <li key={item.key}>
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={`flex h-full min-h-[3.5rem] items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400 ${active ? "border-gold-400 bg-white/15" : "border-white/20 bg-white/5 active:bg-white/15"}`}
                          >
                            <span aria-hidden="true" className="text-lg leading-none">{item.icon}</span>
                            <span className="min-w-0 leading-tight [overflow-wrap:anywhere]">{item.label}</span>
                            {item.count ? <span className="ml-auto shrink-0 rounded-full bg-gold-400 px-2 py-0.5 text-[11px] font-bold text-emerald-950" aria-label={t("shell.waiting", { count: item.count })}>{item.count}</span> : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              {q && sections.length === 0 && extra.length === 0 && (
                <p className="py-4 text-sm text-white/60">{t("shell.noMatches", { query: query.trim() })}</p>
              )}
            </nav>

            <div className="mt-2 border-t border-white/10 pt-4">{footer}</div>
          </div>
        </div>
      )}
    </div>
  );
}
