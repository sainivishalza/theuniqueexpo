"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { filterByQuery } from "@/lib/search";

// The state behind a list's search box: what was typed, and the records that match it.
// `extra` adds text that is not in the record itself (for example a status shown by its
// translated name, or a nested label looked up elsewhere).
export function useListSearch<T>(items: T[], extra?: (item: T) => string) {
  const [query, setQuery] = useState("");
  // The list is filtered a moment after the keystroke, so typing never stalls on a long list.
  const deferred = useDeferredValue(query);
  const results = useMemo(() => filterByQuery(items, deferred, extra), [items, deferred, extra]);
  const active = deferred.trim() !== "";
  return { query, setQuery, results, active, shown: results.length, total: items.length };
}

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  /** How many records are listed now / in all (shows "Showing x of y" while searching). */
  shown?: number;
  total?: number;
  placeholder?: string;
  className?: string;
  /** Visible label text for screen readers (defaults to "Search"). */
  label?: string;
  /** For a toolbar: no margin and no "Showing x of y" line (the page shows its own count). */
  compact?: boolean;
}

export default function SearchBox({ value, onChange, shown, total, placeholder, className = "", label, compact = false }: SearchBoxProps) {
  const t = useTranslations("common.search");
  const id = useId();
  const searching = value.trim() !== "";
  return (
    <div role="search" className={`${compact ? "" : "mb-5"} ${className}`}>
      <label htmlFor={id} className="sr-only">{label || t("label")}</label>
      <div className="relative">
        <svg aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
        </svg>
        <input
          id={id}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || t("placeholder")}
          autoComplete="off"
          className="w-full rounded-[var(--radius-button)] border border-gray-700 bg-white py-2.5 pl-10 pr-10 text-base sm:text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-900/10 [&::-webkit-search-cancel-button]:hidden"
        />
        {searching && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={t("clear")}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900"
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>
      {!compact && (
        <p aria-live="polite" className="mt-1.5 min-h-[1.25rem] text-xs text-gray-600">
          {searching && shown !== undefined && total !== undefined ? t("showing", { shown, total }) : ""}
        </p>
      )}
    </div>
  );
}

// Shown in place of a list when nothing matches the search.
export function SearchEmpty({ query, onClear }: { query: string; onClear: () => void }) {
  const t = useTranslations("common.search");
  return (
    <div role="status" className="rounded-xl bg-white px-6 py-10 text-center shadow-[var(--shadow-card-sm)]">
      <p className="font-semibold text-heading [overflow-wrap:anywhere]">{t("noResults", { query: query.trim() })}</p>
      <p className="mt-1 text-sm text-gray-600">{t("noResultsHint")}</p>
      <button type="button" onClick={onClear} className="mt-4 text-sm font-semibold text-emerald-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 rounded-sm">
        {t("clear")}
      </button>
    </div>
  );
}
