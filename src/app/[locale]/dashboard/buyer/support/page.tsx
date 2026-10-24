"use client";

import { Suspense, useCallback, useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatInstantDateTime } from "@/lib/date-format";
import { fieldClasses } from "@/components/ui/FormField";
import { errorKey, walletApi } from "@/lib/client/wallet-client";
import { SUPPORT_BODY_MAX, SUPPORT_SUBJECT_MAX, SUPPORT_TOPICS, type SupportStatus, type SupportTopic, type SupportWaitingOn } from "@/lib/support";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface Thread { id: number; topic: SupportTopic; subject: string; status: SupportStatus; waitingOn: SupportWaitingOn; lastMessageAt: string; unread: boolean }
interface Message { id: number; fromStaff: boolean; body: string; createdAt: string }

function stateOf(t: Thread): "closed" | "waiting" | "answered" {
  return t.status === "closed" ? "closed" : t.waitingOn === "staff" ? "waiting" : "answered";
}
const TONE: Record<string, BadgeTone> = { waiting: "warning", answered: "success", closed: "gray" };

// "Ask our team": the buyer's conversations with the staff. A list, a form for a new question, and one conversation at a time.
function SupportView() {
  const t = useTranslations("buyerSupport");
  const te = useTranslations("buyerWallet");
  const locale = useLocale();
  const { user, loading } = useAuth();
  const params = useSearchParams();
  const ids = { topic: useId(), subject: useId(), body: useId(), reply: useId() };
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [view, setView] = useState<"list" | "new" | "thread">("list");
  const [open, setOpen] = useState<{ thread: Thread; messages: Message[] } | null>(null);
  const [topic, setTopic] = useState<SupportTopic>("registration");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const isBuyer = user?.role === "buyer";

  const loadList = useCallback(async () => {
    const res = await walletApi<{ items: Thread[] }>("/api/support/threads");
    if (!res.ok) {
      setError(te(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setThreads(res.data.items);
  }, [te]);

  const openThread = useCallback(
    async (id: number) => {
      setError("");
      setSent(false);
      const res = await walletApi<{ thread: Thread; messages: Message[] }>(`/api/support/threads/${id}`);
      if (!res.ok) {
        setError(te(`errors.${errorKey(res.data.code)}`));
        return;
      }
      setOpen(res.data);
      setView("thread");
      setReply("");
      loadList();
    },
    [te, loadList]
  );

  useEffect(() => {
    if (!isBuyer) return;
    loadList();
    const wanted = Number(params.get("thread"));
    if (Number.isSafeInteger(wanted) && wanted > 0) openThread(wanted);
    // only when the buyer is known: the thread in the address is opened once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBuyer]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await walletApi<{ id: number }>("/api/support/threads", { method: "POST", body: { topic, subject, body } });
    setBusy(false);
    if (!res.ok) {
      setError(te(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setSubject("");
    setBody("");
    await openThread(res.data.id);
    setSent(true);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!open) return;
    setBusy(true);
    setError("");
    const res = await walletApi(`/api/support/threads/${open.thread.id}`, { method: "POST", body: { body: reply } });
    setBusy(false);
    if (!res.ok) {
      setError(te(`errors.${errorKey(res.data.code)}`));
      return;
    }
    await openThread(open.thread.id);
    setSent(true);
  }

  const shell = (children: React.ReactNode) => (
    <div>
      <section className="gradient-hero py-10">
        <div className="mx-auto max-w-3xl px-6">
          <Link href="/dashboard/buyer" className="py-1 text-sm text-emerald-200 hover:text-white mb-3 inline-block">{t("back")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{t("subtitle")}</p>
        </div>
      </section>
      <section className="py-8 bg-cream-50 min-h-[50vh]">
        <div className="mx-auto max-w-3xl px-6">{children}</div>
      </section>
    </div>
  );

  if (loading) return shell(<p className="text-center text-gray-700">{t("loading")}</p>);
  if (!user) {
    return shell(
      <Card shadow="sm" bordered={false} className="p-8 text-center">
        <p className="mb-4 text-gray-800">{t("signInHint")}</p>
        <Button href={`/login?next=${encodeURIComponent("/dashboard/buyer/support")}`} variant="gradientCta" size="wide">{t("signIn")}</Button>
      </Card>
    );
  }
  if (!isBuyer) return shell(<Card shadow="sm" bordered={false} className="p-8 text-center"><p className="text-gray-800">{t("buyersOnly")}</p></Card>);

  return shell(
    <div className="space-y-5">
      {error && <p role="alert" className="text-red-700">{error}</p>}

      {view === "list" && (
        <>
          <Button type="button" variant="gradientCta" size="compact" onClick={() => { setView("new"); setError(""); setSent(false); }} data-testid="support-new">{t("newMessage")}</Button>
          {threads === null ? (
            <p className="text-gray-700">{t("loading")}</p>
          ) : threads.length === 0 ? (
            <p className="text-gray-700" data-testid="support-empty">{t("empty")}</p>
          ) : (
            <ul className="space-y-3" data-testid="support-list">
              {threads.map((th) => (
                <li key={th.id} data-testid={`support-thread-${th.id}`}>
                  <Card shadow="sm" bordered={false} className="p-4">
                    <button type="button" onClick={() => openThread(th.id)} className="block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 rounded-sm">
                      <span className="flex flex-wrap items-start justify-between gap-2">
                        <span className="font-bold text-heading [overflow-wrap:anywhere]">{th.subject}</span>
                        <span className="flex items-center gap-2">
                          {th.unread && <Badge tone="live" size="status">{t("newAnswer")}</Badge>}
                          <Badge tone={TONE[stateOf(th)]} size="status">{t(`status.${stateOf(th)}`)}</Badge>
                        </span>
                      </span>
                      <span className="mt-1 block text-sm text-gray-700">{t(`topics.${th.topic}`)} · {formatInstantDateTime(th.lastMessageAt, locale)}</span>
                    </button>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {view === "new" && (
        <form onSubmit={create} className="space-y-4" data-testid="support-form">
          <Card shadow="sm" bordered={false} className="p-5 space-y-4">
            <h2 className="text-lg font-bold text-heading">{t("newMessage")}</h2>
            <div>
              <label htmlFor={ids.topic} className="block text-sm font-medium text-gray-700 mb-1.5">{t("topic")}</label>
              <select id={ids.topic} value={topic} onChange={(e) => setTopic(e.target.value as SupportTopic)} className={fieldClasses()}>
                {SUPPORT_TOPICS.map((x) => <option key={x} value={x}>{t(`topics.${x}`)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={ids.subject} className="block text-sm font-medium text-gray-700 mb-1.5">{t("subject")}</label>
              <input id={ids.subject} value={subject} maxLength={SUPPORT_SUBJECT_MAX} onChange={(e) => setSubject(e.target.value)} className={fieldClasses()} autoComplete="off" />
            </div>
            <div>
              <label htmlFor={ids.body} className="block text-sm font-medium text-gray-700 mb-1.5">{t("message")}</label>
              <textarea id={ids.body} rows={6} value={body} maxLength={SUPPORT_BODY_MAX} onChange={(e) => setBody(e.target.value)} className={fieldClasses()} />
              <p className="mt-1 text-xs text-gray-600">{t("charsLeft", { count: SUPPORT_BODY_MAX - body.length })}</p>
            </div>
          </Card>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="gradientCta" size="compact" disabled={busy || subject.trim().length < 2 || body.trim().length < 2} data-testid="support-send">{busy ? t("sending") : t("send")}</Button>
            <Button type="button" variant="secondaryOutline" size="compact" onClick={() => setView("list")}>{t("cancel")}</Button>
          </div>
        </form>
      )}

      {view === "thread" && open && (
        <div className="space-y-4" data-testid="support-conversation">
          <button type="button" onClick={() => { setView("list"); setOpen(null); }} className="inline-block py-1 text-sm font-semibold text-emerald-800 underline" data-testid="support-back">{t("backToList")}</button>
          <div>
            <h2 className="text-xl font-bold text-heading [overflow-wrap:anywhere]">{open.thread.subject}</h2>
            <p className="text-sm text-gray-700">{t(`topics.${open.thread.topic}`)} · {t(`status.${stateOf(open.thread)}`)}</p>
          </div>
          <ol className="space-y-3" data-testid="support-messages">
            {open.messages.map((m) => (
              <li key={m.id} className={m.fromStaff ? "mr-8" : "ml-8"} data-testid={m.fromStaff ? "msg-staff" : "msg-buyer"}>
                <div className={`rounded-2xl p-4 shadow-sm ${m.fromStaff ? "bg-emerald-50 text-emerald-950" : "bg-white text-gray-900"}`}>
                  <p className="text-xs font-semibold text-gray-700">{m.fromStaff ? t("fromTeam") : t("fromYou")} · {formatInstantDateTime(m.createdAt, locale)}</p>
                  <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{m.body}</p>
                </div>
              </li>
            ))}
          </ol>
          {sent && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-green-900" data-testid="support-sent">{t("sent")}</p>}
          <form onSubmit={send} className="space-y-3">
            {open.thread.status === "closed" && <p className="text-sm text-gray-700">{t("closedNote")}</p>}
            <div>
              <label htmlFor={ids.reply} className="block text-sm font-medium text-gray-700 mb-1.5">{t("yourReply")}</label>
              <textarea id={ids.reply} rows={4} value={reply} maxLength={SUPPORT_BODY_MAX} onChange={(e) => setReply(e.target.value)} className={fieldClasses()} />
            </div>
            <Button type="submit" variant="gradientCta" size="compact" disabled={busy || reply.trim().length < 2} data-testid="support-reply-send">{busy ? t("sending") : t("send")}</Button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function BuyerSupportPage() {
  return (
    <Suspense fallback={null}>
      <SupportView />
    </Suspense>
  );
}
