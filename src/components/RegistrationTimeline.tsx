"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatDateTime } from "@/lib/client/registration-format";
import { buildTimeline, type TimelineState } from "@/lib/registration-timeline";
import type { MyRegistration } from "@/lib/registration-lifecycle";

const MARK: Record<TimelineState, { symbol: string; ring: string }> = {
  done: { symbol: "✓", ring: "bg-emerald-700 text-white border-emerald-700" },
  current: { symbol: "●", ring: "bg-white text-emerald-800 border-emerald-700" },
  todo: { symbol: "", ring: "bg-white text-gray-400 border-gray-300" },
  problem: { symbol: "✕", ring: "bg-red-50 text-red-700 border-red-600" },
};

// Where a registration stands, step by step, with the date each step happened.
export default function RegistrationTimeline({ registration, className = "" }: { registration: MyRegistration; className?: string }) {
  const t = useTranslations("expoRegistrationStatus.timeline");
  const locale = useLocale();
  const steps = buildTimeline(registration);
  return (
    <ol aria-label={t("title")} className={`space-y-0 ${className}`} data-testid="registration-timeline">
      {steps.map((s, i) => (
        <li key={s.key} data-step={s.key} data-state={s.state} className="relative flex gap-3 pb-4 last:pb-0">
          {i < steps.length - 1 && <span aria-hidden="true" className="absolute left-[0.7rem] top-6 bottom-0 w-px bg-gray-200" />}
          <span aria-hidden="true" className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${MARK[s.state].ring}`}>{MARK[s.state].symbol}</span>
          <div className="min-w-0">
            <p className={`text-sm leading-6 ${s.state === "todo" ? "text-gray-500" : "font-semibold text-heading"}`}>
              {t(`steps.${s.key}`)}
              <span className="sr-only"> ({t(`states.${s.state}`)})</span>
            </p>
            {s.at && <p className="text-xs text-gray-500">{formatDateTime(s.at, locale)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
