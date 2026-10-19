"use client";

import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import SearchBox, { SearchEmpty } from "@/components/search/ListSearch";
import { matchesQuery } from "@/lib/search";

export interface SearchEntry {
  key: string | number;
  /** The words a visitor can find this entry by (title, summary, category, ...). */
  text: string;
  /** What is drawn for it. Built on the server, so it is in the page's HTML for search engines. */
  node: ReactNode;
}

// A grid of cards with a search box above it, for pages that are built on the server (blog,
// magazine, videos...). With nothing typed every card is shown, exactly as before.
export default function SearchableGrid({
  entries,
  className,
  placeholder,
  label,
}: {
  entries: SearchEntry[];
  className: string;
  placeholder?: string;
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const results = useMemo(() => entries.filter((e) => matchesQuery(e.text, deferred)), [entries, deferred]);
  const searching = deferred.trim() !== "";
  return (
    <div>
      <SearchBox value={query} onChange={setQuery} shown={results.length} total={entries.length} placeholder={placeholder} label={label} className="max-w-xl" />
      {searching && results.length === 0 && <SearchEmpty query={query} onClear={() => setQuery("")} />}
      <div className={className}>
        {results.map((e) => (
          <div key={e.key} className="contents">{e.node}</div>
        ))}
      </div>
    </div>
  );
}
