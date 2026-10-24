"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface Counts {
  registrations: number;
  staleRegistrations?: number;
  tourRegistrations: number;
  topups: number;
  withdrawals: number;
  expenses: number;
  documents: number;
  failedEmails: number;
  twoStepOff?: boolean;
}

const ROWS: { key: Exclude<keyof Counts, "twoStepOff">; icon: string; href: string; urgent?: boolean }[] = [
  // Waiting too long comes first, in red; both lead to the oldest pending registrations.
  { key: "staleRegistrations", icon: "⏳", href: "/admin/registrations?status=pending&sort=oldest", urgent: true },
  { key: "registrations", icon: "🎪", href: "/admin/registrations?status=pending&sort=oldest" },
  { key: "tourRegistrations", icon: "🧳", href: "/admin/tours" },
  { key: "topups", icon: "💳", href: "/admin/wallet?tab=topups" },
  { key: "withdrawals", icon: "💸", href: "/admin/wallet?tab=withdrawals" },
  { key: "expenses", icon: "🧾", href: "/admin/wallet?tab=expenses" },
  { key: "documents", icon: "🪪", href: "/admin/buyer-profiles?docs=waiting_review" },
  { key: "failedEmails", icon: "📭", href: "/admin/email" },
];

// Everything that waits for an admin, with the number and a link straight to it. Shown at the
// top of the admin home; only things with something waiting are listed.
export default function AttentionPanel() {
  const t = useTranslations("adminHome.attention");
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/attention")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => alive && data && setCounts(data))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const waiting = counts ? ROWS.filter((r) => (counts[r.key] ?? 0) > 0) : [];

  return (
    <section aria-labelledby="attention-title" className="mx-auto max-w-7xl px-6 pt-8">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gold-400/60">
        <h2 id="attention-title" className="text-lg font-bold text-heading">{t("title")}</h2>
        {!counts ? (
          <p className="mt-2 text-sm text-gray-600">{t("loading")}</p>
        ) : waiting.length === 0 ? (
          <p className="mt-2 text-sm font-semibold text-emerald-800">✓ {t("allClear")}</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {waiting.map((r) => (
              <li key={r.key}>
                <Link href={r.href} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${r.urgent ? "border-red-700 bg-red-50 text-red-900 hover:bg-red-100" : "border-emerald-600 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"}`}>
                  <span aria-hidden="true" className="text-xl">{r.icon}</span>
                  <span>{t(r.key, { count: counts[r.key] ?? 0 })}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {counts?.twoStepOff && (
          <p className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-700">
            🔐 {t("twoStepOff")}{" "}
            <Link href="/admin/account#two-step" className="py-1 font-semibold text-emerald-800 underline hover:text-emerald-900">{t("twoStepAction")}</Link>
          </p>
        )}
      </div>
    </section>
  );
}
