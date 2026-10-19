"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type Kind = "exhibition" | "tour" | "event" | "article" | "magazine" | "video";
interface Result { kind: Kind; title: string; subtitle: string; href: string }
interface Group { kind: Kind; total: number; items: Result[] }

const ICONS: Record<Kind, string> = { exhibition: "🎯", tour: "🧳", event: "🎉", article: "📰", magazine: "📖", video: "🎬" };

const needsQuery = (q: string) => q.trim().length < 2 && !/[㐀-鿿]/.test(q);

export default function SiteSearchView() {
  const t = useTranslations("searchPage");
  const locale = useLocale();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  // A link such as /search?q=ocean opens with the words already in the box.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q") ?? "";
    if (q) setQuery(q.slice(0, 80));
    started.current = true;
  }, []);

  useEffect(() => {
    if (!started.current) return;
    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set("q", query.trim());
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);

    if (needsQuery(query)) {
      setGroups(null);
      setError(false);
      setBusy(false);
      return;
    }
    const controller = new AbortController();
    setBusy(true);
    // Waits for a pause in typing, then asks the server.
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}&locale=${locale}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error("failed"))))
        .then((data) => {
          setGroups(data.groups || []);
          setError(false);
        })
        .catch((err) => {
          if (err?.name !== "AbortError") setError(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, locale]);

  const total = groups ? groups.reduce((n, g) => n + g.total, 0) : 0;

  return (
    <div>
      <section className="bg-[var(--color-hero-bg)] py-14">
        <div className="mx-auto max-w-3xl px-6 text-white">
          <h1 className="text-3xl md:text-4xl font-extrabold">{t("title")}</h1>
          <p className="mt-2 text-gray-300">{t("subtitle")}</p>
          <form role="search" onSubmit={(e) => e.preventDefault()} className="mt-6">
            <label htmlFor={inputId} className="sr-only">{t("label")}</label>
            <input
              id={inputId}
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("placeholder")}
              autoComplete="off"
              maxLength={80}
              className="w-full rounded-[var(--radius-button)] border border-gray-700 bg-white px-5 py-3.5 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </form>
        </div>
      </section>

      <section className="py-10 bg-cream-50 min-h-[40vh]">
        <div className="mx-auto max-w-3xl px-6">
          <p aria-live="polite" className="mb-4 min-h-[1.25rem] text-sm text-gray-600">
            {busy ? t("searching") : groups && !needsQuery(query) ? (total > 0 ? t("resultCount", { count: total }) : "") : ""}
          </p>
          {error && <p role="alert" className="text-red-700">{t("failed")}</p>}
          {needsQuery(query) && !error && <p className="text-gray-600">{t("hint")}</p>}
          {groups && groups.length === 0 && !needsQuery(query) && !error && (
            <div role="status" className="rounded-xl bg-white px-6 py-10 text-center shadow-[var(--shadow-card-sm)]">
              <p className="font-semibold text-heading [overflow-wrap:anywhere]">{t("noResults", { query: query.trim() })}</p>
              <p className="mt-1 text-sm text-gray-600">{t("noResultsHint")}</p>
            </div>
          )}
          <div className="space-y-8">
            {groups?.map((g) => (
              <section key={g.kind} aria-labelledby={`${inputId}-${g.kind}`}>
                <h2 id={`${inputId}-${g.kind}`} className="mb-3 text-lg font-bold text-heading">
                  {t(`kinds.${g.kind}`)} <span className="text-sm font-semibold text-gray-600">({g.total})</span>
                </h2>
                <ul className="space-y-2">
                  {g.items.map((r) => (
                    <li key={r.href + r.title}>
                      <Link href={r.href} className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 shadow-[var(--shadow-card-sm)] hover:shadow-[var(--shadow-card-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2">
                        <span className="mt-0.5 text-xl" aria-hidden="true">{ICONS[r.kind]}</span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-heading [overflow-wrap:anywhere]">{r.title}</span>
                          {r.subtitle && <span className="block text-sm text-gray-600 line-clamp-2 [overflow-wrap:anywhere]">{r.subtitle}</span>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {g.total > g.items.length && <p className="mt-2 text-sm text-gray-600">{t("moreResults", { count: g.total - g.items.length })}</p>}
              </section>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
