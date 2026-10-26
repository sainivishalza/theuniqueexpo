"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatInstantDateTime } from "@/lib/date-format";
import { fieldClasses } from "@/components/ui/FormField";
import { errorKey, walletApi } from "@/lib/client/wallet-client";
import { SUPPORT_BODY_MAX, type SupportStatus, type SupportTopic, type SupportWaitingOn } from "@/lib/support";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { formatNumber } from "@/lib/format";

interface Thread {
  id: number; topic: SupportTopic; subject: string; status: SupportStatus; waitingOn: SupportWaitingOn; lastMessageAt: string;
  userId: number; buyerName: string; buyerNumber: string; buyerEmail: string; messageCount: number;
}
interface Message { id: number; fromStaff: boolean; body: string; createdAt: string }
interface Snapshot { balance: number; registrations: { id: number; title: string; status: string; startDate: string }[]; claimsWaiting: number; withdrawalsWaiting: number }

const FILTERS = ["waiting", "answered", "closed", "all"] as const;
type Filter = (typeof FILTERS)[number];
const TONE: Record<string, BadgeTone> = { waiting: "warning", answered: "success", closed: "gray" };
const stateOf = (t: Thread) => (t.status === "closed" ? "closed" : t.waitingOn === "staff" ? "waiting" : "answered");

// Buyers' messages to our team: those waiting for an answer come first; open one, read it, answer it, close it.
export default function AdminSupportPage() {
  const t = useTranslations("adminSupport");
  const tw = useTranslations("adminWallet");
  const ta = useTranslations("adminCommon");
  const tr = useTranslations("adminRegistrationsCommon");
  const locale = useLocale();
  const { user, loading } = useAuth();
  const ids = { search: useId(), reply: useId() };
  const [filter, setFilter] = useState<Filter>("waiting");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Thread[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ thread: Thread; messages: Message[]; snapshot: Snapshot } | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = !loading && user?.role === "admin";

  useEffect(() => {
    const timer = setTimeout(() => setSearch(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const load = useCallback(
    async (next: number) => {
      const res = await walletApi<{ items: Thread[]; hasMore: boolean }>(`/api/admin/support?filter=${filter}&q=${encodeURIComponent(search)}&page=${next}`);
      if (!res.ok) {
        setError(tw(`errors.${errorKey(res.data.code)}`));
        return;
      }
      setError("");
      setPage(next);
      setItems((prev) => (next === 1 || !prev ? res.data.items : [...prev, ...res.data.items]));
      setHasMore(res.data.hasMore);
    },
    [filter, search, tw]
  );

  useEffect(() => {
    if (isAdmin) load(1);
  }, [isAdmin, load]);

  async function openThread(id: number) {
    setOpenId(id);
    setDetail(null);
    setReply("");
    const res = await walletApi<{ thread: Thread; messages: Message[]; snapshot: Snapshot }>(`/api/admin/support/${id}`);
    if (!res.ok) {
      setError(tw(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setDetail(res.data);
  }

  async function act(body: { action: "reply" | "close" | "reopen"; body?: string }) {
    if (openId === null) return;
    setBusy(true);
    setError("");
    const res = await walletApi(`/api/admin/support/${openId}`, { method: "POST", body });
    setBusy(false);
    if (!res.ok) {
      setError(tw(`errors.${errorKey(res.data.code)}`));
      return;
    }
    await openThread(openId);
    load(1);
  }

  if (loading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-700">{ta("accessRequired")}</p></div>;
  }

  return (
    <div>
      <section className="bg-[var(--color-hero-bg)] py-8">
        <div className="mx-auto max-w-4xl px-6">
          <Link href="/admin" className="py-1 inline-flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors mb-4">{ta("backToAdmin")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-gray-300">{t("subtitle")}</p>
        </div>
      </section>
      <section className="py-8 bg-cream-50 min-h-[60vh]">
        <div className="mx-auto max-w-4xl px-6 space-y-5">
          <div className="flex flex-wrap items-end gap-3">
            <div role="group" aria-label={t("filterLabel")} className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button key={f} type="button" aria-pressed={filter === f} onClick={() => { setFilter(f); setOpenId(null); setDetail(null); }}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 ${filter === f ? "bg-emerald-900 text-white" : "border border-gray-200 bg-white text-gray-700 hover:bg-cream-50"}`}>
                  {t(`filters.${f}`)}
                </button>
              ))}
            </div>
            <div className="min-w-[12rem] flex-1">
              <label htmlFor={ids.search} className="block text-xs font-medium text-gray-700 mb-1">{t("search")}</label>
              <input id={ids.search} type="search" value={q} onChange={(e) => setQ(e.target.value)} className={fieldClasses()} />
            </div>
          </div>
          {error && <p role="alert" className="text-red-700">{error}</p>}
          {openId !== null && (
            <Card shadow="sm" bordered={false} className="p-5 space-y-4" data-testid="admin-support-detail">
              {!detail ? (
                <p className="text-gray-600">{t("loading")}</p>
              ) : (
                <>
                  <div>
                    <h2 className="text-xl font-bold text-heading [overflow-wrap:anywhere]">{detail.thread.subject}</h2>
                    <p className="text-sm text-gray-700 [overflow-wrap:anywhere]">{detail.thread.buyerName} {detail.thread.buyerNumber} · {detail.thread.buyerEmail}</p>
                    <p className="text-xs text-gray-600">{t(`topics.${detail.thread.topic}`)} · {t(`status.${stateOf(detail.thread)}`)}</p>
                  </div>
                  <div className="rounded-xl bg-cream-50 p-3 text-sm text-gray-800 space-y-1.5" data-testid="admin-support-snapshot">
                    <p className="font-semibold text-heading">{t("snapshot.title")}</p>
                    <p>{t("snapshot.points", { points: formatNumber(detail.snapshot.balance) })}</p>
                    {(detail.snapshot.claimsWaiting > 0 || detail.snapshot.withdrawalsWaiting > 0) && (
                      <p className="font-semibold text-amber-900">{t("snapshot.waiting", { claims: detail.snapshot.claimsWaiting, withdrawals: detail.snapshot.withdrawalsWaiting })}</p>
                    )}
                    {detail.snapshot.registrations.length === 0 ? (
                      <p>{t("snapshot.noRegistrations")}</p>
                    ) : (
                      <ul className="space-y-0.5">
                        {detail.snapshot.registrations.map((r) => (
                          <li key={r.id} className="[overflow-wrap:anywhere]">{t("snapshot.registration", { title: r.title, status: tr(`statuses.${r.status}`) })}</li>
                        ))}
                      </ul>
                    )}
                    <p className="flex flex-wrap gap-x-4">
                      <Link href={`/admin/buyer-profiles?q=${encodeURIComponent(detail.thread.buyerNumber || detail.thread.buyerEmail)}`} className="inline-flex min-h-[1.75rem] items-center font-semibold text-emerald-800 underline underline-offset-2">{t("snapshot.profile")}</Link>
                      <Link href="/admin/wallet?tab=wallets" className="inline-flex min-h-[1.75rem] items-center font-semibold text-emerald-800 underline underline-offset-2">{t("snapshot.wallet")}</Link>
                    </p>
                  </div>
                  <ol className="space-y-3">
                    {detail.messages.map((m) => (
                      <li key={m.id} className={m.fromStaff ? "ml-8" : "mr-8"} data-testid={m.fromStaff ? "admin-msg-staff" : "admin-msg-buyer"}>
                        <div className={`rounded-2xl p-3 shadow-sm ${m.fromStaff ? "bg-emerald-50 text-emerald-950" : "bg-cream-50 text-gray-900"}`}>
                          <p className="text-xs font-semibold text-gray-700">{m.fromStaff ? t("fromTeam") : t("fromBuyer")} · {formatInstantDateTime(m.createdAt, locale)}</p>
                          <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{m.body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div>
                    <label htmlFor={ids.reply} className="block text-sm font-medium text-gray-700 mb-1.5">{t("yourReply")}</label>
                    <textarea id={ids.reply} rows={4} value={reply} maxLength={SUPPORT_BODY_MAX} onChange={(e) => setReply(e.target.value)} className={fieldClasses()} />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" variant="gradientCta" size="compact" disabled={busy || reply.trim().length < 2} onClick={async () => { const text = reply; setReply(""); await act({ action: "reply", body: text }); }} data-testid="admin-support-send">{busy ? t("sending") : t("send")}</Button>
                    {detail.thread.status === "open" ? (
                      <Button type="button" variant="secondaryOutline" size="compact" disabled={busy} onClick={() => act({ action: "close" })} data-testid="admin-support-close">{t("close")}</Button>
                    ) : (
                      <Button type="button" variant="secondaryOutline" size="compact" disabled={busy} onClick={() => act({ action: "reopen" })} data-testid="admin-support-reopen">{t("reopen")}</Button>
                    )}
                    <Button type="button" variant="ghost" size="xs" onClick={() => { setOpenId(null); setDetail(null); }}>{ta("close")}</Button>
                  </div>
                </>
              )}
            </Card>
          )}
          {items !== null && items.length === 0 && <p className="text-gray-700" data-testid="admin-support-empty">{t("empty")}</p>}
          <ul className="space-y-3" data-testid="admin-support-list">
            {(items ?? []).map((th) => (
              <li key={th.id} data-testid={`admin-support-${th.id}`}>
                <Card shadow="sm" bordered={false} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-heading [overflow-wrap:anywhere]">{th.subject}</p>
                      <p className="text-sm text-gray-700 [overflow-wrap:anywhere]">{th.buyerName} {th.buyerNumber} · {th.buyerEmail}</p>
                      <p className="text-xs text-gray-600">{t(`topics.${th.topic}`)} · {t("messages", { count: th.messageCount })} · {formatInstantDateTime(th.lastMessageAt, locale)}</p>
                    </div>
                    <Badge tone={TONE[stateOf(th)]} size="status">{t(`status.${stateOf(th)}`)}</Badge>
                  </div>
                  <div className="mt-3">
                    <Button type="button" variant={stateOf(th) === "waiting" ? "save" : "ghost"} size="xs" onClick={() => openThread(th.id)} data-testid={`admin-support-open-${th.id}`}>{t("open")}</Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          {hasMore && <Button type="button" variant="secondaryOutline" onClick={() => load(page + 1)}>{tw("showMore")}</Button>}
        </div>
      </section>
    </div>
  );
}
