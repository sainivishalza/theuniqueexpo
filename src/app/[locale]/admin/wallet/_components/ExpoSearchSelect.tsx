"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { fieldClasses } from "@/components/ui/FormField";

export interface ExpoChoice {
  name: string;
  hint?: string;
}
export interface ExpoGroup {
  label: string;
  items: ExpoChoice[];
}

// A dropdown with a search box for choosing one expo. The names typed that are not in the list can be used as they are, so an
// expo that is not on the website can still be named.
export default function ExpoSearchSelect({
  id,
  groups,
  value,
  onChange,
  placeholder,
  emptyText,
  useTyped,
  clearText,
  maxLength = 120,
}: {
  id: string;
  groups: ExpoGroup[];
  value: string;
  onChange: (name: string) => void;
  placeholder: string;
  emptyText: string;
  // "Use “{name}”" for a name that is not in the list
  useTyped: (name: string) => string;
  clearText: string;
  maxLength?: number;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const needle = query.trim().toLowerCase();
  // The flat list of what can be picked now, in the order shown.
  const rows = useMemo(() => {
    const shown = groups
      .map((g) => ({ label: g.label, items: g.items.filter((i) => needle === "" || i.name.toLowerCase().includes(needle)) }))
      .filter((g) => g.items.length > 0);
    const typed = query.trim();
    const exact = groups.some((g) => g.items.some((i) => i.name.toLowerCase() === typed.toLowerCase()));
    return { shown, typed: typed.length >= 2 && !exact ? typed : "" };
  }, [groups, needle, query]);
  const flat: string[] = [...rows.shown.flatMap((g) => g.items.map((i) => i.name)), ...(rows.typed ? [rows.typed] : [])];

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function pick(name: string) {
    onChange(name);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, Math.max(flat.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && open && flat[active]) {
      e.preventDefault();
      pick(flat[active]);
    }
  }

  let index = -1;
  const optionId = (i: number) => `${listId}-o${i}`;

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && flat[active] ? optionId(active) : undefined}
        value={open ? query : value}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={fieldClasses()}
        onFocus={() => { setQuery(""); setActive(0); setOpen(true); }}
        onClick={() => { if (!open) { setQuery(""); setActive(0); setOpen(true); } }}
        onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
        onKeyDown={onKeyDown}
      />
      {value && !open && (
        <button
          type="button"
          onClick={() => pick("")}
          aria-label={clearText}
          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
      {open && (
        <div id={listId} role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-300 bg-white py-1 shadow-lg" data-testid="expo-list">
          {flat.length === 0 && <p className="px-3 py-2 text-sm text-gray-700">{emptyText}</p>}
          {rows.shown.map((g) => (
            <div key={g.label} role="group" aria-label={g.label}>
              <p className="px-3 pb-1 pt-2 text-xs font-semibold text-gray-700" aria-hidden="true">{g.label}</p>
              {g.items.map((i) => {
                index += 1;
                const mine = index;
                return (
                  <div
                    key={g.label + i.name}
                    id={optionId(mine)}
                    role="option"
                    aria-selected={i.name === value}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(i.name)}
                    onMouseEnter={() => setActive(mine)}
                    className={`flex min-h-[2.5rem] cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ${mine === active ? "bg-cream-50" : ""} ${i.name === value ? "font-semibold" : ""}`}
                  >
                    <span className="[overflow-wrap:anywhere]">{i.name}</span>
                    {i.hint && <span className="shrink-0 text-xs text-gray-700">{i.hint}</span>}
                  </div>
                );
              })}
            </div>
          ))}
          {rows.typed && (() => {
            index += 1;
            const mine = index;
            return (
              <div
                id={optionId(mine)}
                role="option"
                aria-selected={false}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(rows.typed)}
                onMouseEnter={() => setActive(mine)}
                className={`min-h-[2.5rem] cursor-pointer border-t border-gray-100 px-3 py-2 text-sm font-semibold text-heading [overflow-wrap:anywhere] ${mine === active ? "bg-cream-50" : ""}`}
                data-testid="expo-use-typed"
              >
                {useTyped(rows.typed)}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
