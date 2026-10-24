"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { whatsappChatUrl } from "@/lib/company-profile";
import { filterByQuery } from "@/lib/search";

interface Answer {
  title: string;
  description: string;
}

const MAX_SHOWN = 4;

// A small help box on every public page: type a question, read the matching answers from the Help Center
// (the same text the admin edits there), and if nothing fits, carry the question over to WhatsApp.
// No guessing and no AI: it only ever shows what is written in the Help Center.
export default function HelpWidget({ number }: { number: string }) {
  const t = useTranslations("helpWidget");
  const tw = useTranslations("whatsappButton");
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [answers, setAnswers] = useState<Answer[] | null>(null);
  const [failed, setFailed] = useState(false);
  const panelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  // The answers are fetched the first time the box is opened, not with every page.
  useEffect(() => {
    if (!open || answers || failed) return;
    let alive = true;
    fetch(`/api/pages/help-center?locale=${locale}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((d) => alive && setAnswers(Array.isArray(d?.content?.items) ? (d.content.items as Answer[]).filter((i) => i.title && i.description) : []))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [open, answers, failed, locale]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    launcherRef.current?.focus();
  };

  const shown = useMemo(() => {
    if (!answers) return [];
    const list = query.trim() ? filterByQuery(answers, query) : answers;
    return list.slice(0, MAX_SHOWN);
  }, [answers, query]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) return null;

  const question = query.trim();
  const whatsapp = whatsappChatUrl(number, question ? t("whatsappQuestion", { question: question.slice(0, 300) }) : tw("prefill"));

  return (
    <>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={t("title")}
          onKeyDown={(e) => e.key === "Escape" && close()}
          className="fixed bottom-24 right-4 z-40 flex max-h-[75vh] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[var(--radius-card)] border border-gray-200 bg-white shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3 bg-emerald-950 px-4 py-3 text-white">
            <div>
              <p className="text-base font-bold">{t("title")}</p>
              <p className="text-xs text-emerald-100">{t("intro")}</p>
            </div>
            <button type="button" onClick={close} aria-label={t("close")} className="-mr-1 rounded p-1 text-xl leading-none text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            <label htmlFor={`${panelId}-q`} className="sr-only">{t("searchLabel")}</label>
            <input
              id={`${panelId}-q`}
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-[var(--radius-button)] border border-gray-700 bg-cream-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-900 focus:ring-2 focus:ring-emerald-900/10"
            />

            <div className="mt-3" aria-live="polite">
              {failed ? (
                <p className="text-sm text-gray-700">{t("loadFailed")}</p>
              ) : !answers ? (
                <p className="text-sm text-gray-700">{t("loading")}</p>
              ) : shown.length === 0 ? (
                <p className="text-sm text-gray-700" data-testid="help-none">{answers.length === 0 ? t("noAnswersYet") : t("none")}</p>
              ) : (
                <>
                  <p className="mb-2 text-xs font-semibold text-gray-700">{question ? t("results", { count: shown.length }) : t("common")}</p>
                  <ul className="space-y-2" data-testid="help-results">
                    {shown.map((a) => (
                      <li key={a.title}>
                        <details className="rounded-[var(--radius-button)] border border-gray-200 bg-white px-3 py-2">
                          <summary className="cursor-pointer text-sm font-semibold text-gray-900">{a.title}</summary>
                          <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{a.description}</p>
                        </details>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2 border-t border-gray-200 bg-cream-50 px-4 py-3">
            <p className="text-xs text-gray-700">{t("notFound")}</p>
            {whatsapp ? (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[#25D366] px-4 py-2.5 text-sm font-bold text-emerald-950 hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-900">
                {question ? t("whatsappAsk") : t("whatsapp")}
                <span className="sr-only"> {t("opensNewTab")}</span>
              </a>
            ) : (
              <Link href="/contact" className="flex items-center justify-center rounded-[var(--radius-button)] bg-emerald-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">{t("contact")}</Link>
            )}
            <Link href="/help" className="block text-center py-1 text-sm font-semibold text-emerald-800 underline underline-offset-2">{t("helpCenter")}</Link>
          </div>
        </div>
      )}

      <button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={t("label")}
        title={t("label")}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-900 text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-900"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 16.5h.01" /></>}
        </svg>
      </button>
    </>
  );
}
