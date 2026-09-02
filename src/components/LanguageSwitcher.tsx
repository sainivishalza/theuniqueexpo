"use client";

import { useLocale } from "next-intl";
import { useState, useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LANGUAGE_LABELS: Record<string, { short: string; native: string }> = {
  en: { short: "EN", native: "English" },
  ru: { short: "RU", native: "Русский" },
  zh: { short: "中文", native: "中文" },
};

export default function LanguageSwitcher({ mobile = false }: { mobile?: boolean }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function selectLocale(nextLocale: string) {
    setOpen(false);
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  if (mobile) {
    return (
      <div className="flex items-center gap-2 py-2">
        {routing.locales.map((code) => (
          <button
            key={code}
            onClick={() => selectLocale(code)}
            disabled={isPending}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              code === locale
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {LANGUAGE_LABELS[code].native}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 000 18M12.5 3a17 17 0 010 18" />
        </svg>
        {LANGUAGE_LABELS[locale]?.short ?? locale.toUpperCase()}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-36 rounded-xl bg-white shadow-lg border border-gray-100 py-1 z-50">
            {routing.locales.map((code) => (
              <button
                key={code}
                onClick={() => selectLocale(code)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  code === locale
                    ? "text-emerald-600 font-semibold bg-emerald-50"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {LANGUAGE_LABELS[code].native}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
