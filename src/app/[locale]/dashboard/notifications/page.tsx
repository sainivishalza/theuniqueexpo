"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/ui/Button";

interface Item {
  id: number;
  kind: string;
  params: Record<string, string | number>;
  path: string;
  createdAt: number;
  read: boolean;
}

const ICONS: Record<string, string> = {
  registrationApproved: "✅", registrationRejected: "❌", registrationReminder: "⏰", tourRegistrationApproved: "✅", tourRegistrationRejected: "❌", documentRejected: "🪪", pointsReceived: "💰",
  topupApproved: "💳", topupRejected: "💳", withdrawalPaid: "💸", withdrawalRejected: "💸", expenseApproved: "🧾", expenseRejected: "🧾",
  passwordChanged: "🔑", announcement: "📣",
};
// What the extra line (the admin's reason or the payment reference) is called.
const EXTRA_LABEL: Record<string, string> = { withdrawalPaid: "reference" };
const KNOWN = Object.keys(ICONS);

// "Notifications": what the site told this person (approvals, documents sent back, points, announcements), newest first.
export default function NotificationsPage() {
  const t = useTranslations("notificationsPage");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Item[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const tell = () => window.dispatchEvent(new Event("notifications-changed"));

  const load = useCallback(
    async (before?: number) => {
      try {
        const res = await fetch(`/api/notifications?locale=${locale}${before ? `&before=${before}` : ""}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setItems((prev) => (before && prev ? [...prev, ...data.items] : data.items));
        setHasMore(!!data.hasMore);
        setError(false);
      } catch {
        setError(true);
        setItems((prev) => prev ?? []);
      }
    },
    [locale]
  );

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function markOne(id: number) {
    setItems((prev) => prev && prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
    try {
      await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "read", id }) });
    } finally {
      tell();
    }
  }

  async function markAll() {
    setBusy(true);
    try {
      const res = await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "readAll" }) });
      if (res.ok) setItems((prev) => prev && prev.map((i) => ({ ...i, read: true })));
    } finally {
      setBusy(false);
      tell();
    }
  }

  if (loading) return null;
  if (!user) {
    return (
      <main className="flex min-h-[40vh] items-center justify-center px-6">
        <Link href="/login" className="font-semibold text-emerald-700 underline">{tc("redirecting")}</Link>
      </main>
    );
  }

  const unreadCount = items ? items.filter((i) => !i.read).length : 0;
  const view = (i: Item) => {
    if (!KNOWN.includes(i.kind)) return { title: t("kinds.other.title"), body: "", extra: "" };
    if (i.kind === "announcement") return { title: String(i.params.subject ?? ""), body: String(i.params.message ?? ""), extra: "" };
    const values = { expo: "", tour: "", date: "", points: "", reason: "", balance: "", document: "", ...i.params };
    const withDate = (i.kind === "registrationApproved") && !!i.params.date;
    return {
      title: t(`kinds.${i.kind}.title`, values),
      body: t(`kinds.${i.kind}.${withDate ? "bodyDeadline" : "body"}`, values),
      extra: i.params.reason ? t(`extra.${EXTRA_LABEL[i.kind] ?? "reason"}`, { text: String(i.params.reason) }) : "",
    };
  };

  return (
    <div>
      <section className="gradient-hero py-10">
        <div className="mx-auto max-w-3xl px-6 text-white">
          <h1 className="text-3xl font-extrabold">{t("title")}</h1>
          <p className="mt-1 text-emerald-100">{t("subtitle")}</p>
        </div>
      </section>
      <section className="bg-cream-50 py-8">
        <div className="mx-auto max-w-3xl px-6">
          {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{t("loadFailed")}</p>}
          {items === null ? (
            <p className="text-sm text-gray-600">{t("loading")}</p>
          ) : items.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <p className="text-3xl" aria-hidden="true">🔔</p>
              <p className="mt-2 font-semibold text-heading">{t("emptyTitle")}</p>
              <p className="mt-1 text-sm text-gray-600">{t("emptyBody")}</p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p role="status" className="text-sm text-gray-700">{unreadCount > 0 ? t("unreadCount", { count: unreadCount }) : t("allRead")}</p>
                {unreadCount > 0 && <Button type="button" variant="secondaryOutline" size="xs" disabled={busy} onClick={markAll}>{t("markAll")}</Button>}
              </div>
              <ul className="space-y-3">
                {items.map((i) => {
                  const v = view(i);
                  return (
                    <li key={i.id} className={`rounded-2xl p-4 shadow-sm ${i.read ? "bg-white" : "bg-emerald-50 ring-1 ring-emerald-600/40"}`}>
                      <div className="flex items-start gap-3">
                        <span aria-hidden="true" className="text-2xl leading-none">{ICONS[i.kind] ?? "🔔"}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <h2 className="font-bold text-heading [overflow-wrap:anywhere]">
                              {!i.read && <span className="mr-2 rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-bold text-white">{t("new")}</span>}
                              {v.title}
                            </h2>
                            <time className="text-xs text-gray-600" dateTime={new Date(i.createdAt * 1000).toISOString()}>
                              {new Date(i.createdAt * 1000).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
                            </time>
                          </div>
                          {v.body && <p className="mt-1 whitespace-pre-line text-sm text-gray-700 [overflow-wrap:anywhere]">{v.body}</p>}
                          {v.extra && <p className="mt-1 text-sm text-gray-600 [overflow-wrap:anywhere]">{v.extra}</p>}
                          <div className="mt-2 flex flex-wrap gap-3 text-sm">
                            {i.path && (
                              <Link href={i.path} onClick={() => !i.read && markOne(i.id)} className="font-semibold text-emerald-800 underline hover:text-emerald-900">{t("open")}</Link>
                            )}
                            {!i.read && (
                              <button type="button" onClick={() => markOne(i.id)} className="font-semibold text-gray-700 underline hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900">{t("markRead")}</button>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {hasMore && (
                <div className="mt-4 text-center">
                  <Button type="button" variant="secondaryOutline" size="xs" onClick={() => load(items[items.length - 1].id)}>{t("older")}</Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
