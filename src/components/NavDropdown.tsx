"use client";

import { useRef, useState } from "react";
import { Link } from "@/i18n/navigation";

export interface NavDropdownItem {
  label: string;
  href: string;
}

// Desktop-only hover dropdown -- NavBar renders a separate accordion for
// the same items in the mobile menu (hover doesn't exist there).
export default function NavDropdown({ label, href, items }: { label: string; href: string; items: NavDropdownItem[] }) {
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
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <Link
        href={href}
        className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-colors"
        onClick={() => setOpen(false)}
      >
        {label}
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Link>
      {open && (
        <div className="absolute left-0 top-full pt-1 w-56 z-50">
          <div className="rounded-xl bg-white shadow-lg border border-gray-100 py-2">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-emerald-600 transition-colors"
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
