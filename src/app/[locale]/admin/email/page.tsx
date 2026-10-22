"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { fieldClasses } from "@/components/ui/FormField";
import Button from "@/components/ui/Button";

interface Settings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  hasPassword: boolean;
  fromName: string;
  fromEmail: string;
}

interface LogRow {
  id: number;
  toEmail: string;
  kind: string;
  subject: string;
  status: "sent" | "failed";
  error: string;
  createdAt: string;
}

const KINDS = [
  "passwordReset", "passwordChanged", "registrationApproved", "registrationRejected", "documentRejected", "pointsReceived",
  "topupApproved", "topupRejected", "withdrawalPaid", "withdrawalRejected", "expenseApproved", "expenseRejected", "confirmEmail", "registrationReminder", "announcement", "test",
];

// Admin -> Email: the mail server the website sends from, a test button, and what was sent lately.
export default function AdminEmailPage() {
  const t = useTranslations("adminEmail");
  const ta = useTranslations("adminCommon");
  const locale = useLocale();
  const { user, loading: authLoading } = useAuth();
  const ids = { enabled: useId(), host: useId(), port: useId(), secure: useId(), user: useId(), pass: useId(), fromName: useId(), fromEmail: useId() };
  const [form, setForm] = useState<Settings | null>(null);
  const [password, setPassword] = useState("");
  const [log, setLog] = useState<LogRow[]>([]);
  const [reminders, setReminders] = useState<{ lastRunAt: string | null; lastCount: number; hasKey: boolean } | null>(null);
  const [newKey, setNewKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<"" | "save" | "test">("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/email", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setForm(data.settings);
      setLog(data.log);
      setReminders(data.reminders ?? null);
    } catch {
      setError(ta("somethingWentWrong"));
    }
  }, [ta]);

  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user, load]);

  const errorText = (code: unknown) => (typeof code === "string" && t.has(`errors.${code}`) ? t(`errors.${code}`) : ta("somethingWentWrong"));

  async function save() {
    if (!form) return;
    setBusy("save");
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, port: Number(form.port), ...(password !== "" ? { password } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errorText(data.code));
        return;
      }
      setForm(data.settings);
      setPassword("");
      setNotice(t("saved"));
    } catch {
      setError(ta("somethingWentWrong"));
    } finally {
      setBusy("");
    }
  }

  async function makeKey() {
    setError("");
    setCopied(false);
    try {
      const res = await fetch("/api/admin/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reminderKey" }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.key) throw new Error();
      setNewKey(data.key);
      load();
    } catch {
      setError(ta("somethingWentWrong"));
    }
  }

  async function sendTest() {
    setBusy("test");
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setNotice(t("testSent", { email: user?.email ?? "" }));
      else setError(data.code === "rate_limited" ? errorText("rate_limited") : t("testFailed", { reason: data.error ? String(data.error) : "?" }));
    } catch {
      setError(ta("somethingWentWrong"));
    } finally {
      setBusy("");
      load();
    }
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-600">{ta("accessRequired")}</p></div>;
  }

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  return (
    <div>
      <section className="bg-[var(--color-hero-bg)] py-8">
        <div className="mx-auto max-w-4xl px-6">
          <Link href="/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white">{ta("backToAdmin")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-400">{t("subtitle")}</p>
        </div>
      </section>

      <section className="bg-cream-50 py-10">
        <div className="mx-auto max-w-4xl space-y-6 px-6">
          {error && <div role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
          {notice && <div role="status" className="rounded-lg bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-800">{notice}</div>}
          {!form && !error && <p className="text-sm text-gray-600">{ta("loading")}</p>}

          {form && (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-bold text-heading">{t("settingsTitle")}</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${form.enabled ? "bg-green-50 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                  {form.enabled ? t("statusOn") : t("statusOff")}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600">{t("intro")}</p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor={ids.host} className="mb-1.5 block text-sm font-medium text-gray-700">{t("host")}</label>
                  <input id={ids.host} value={form.host} onChange={(e) => set("host", e.target.value)} autoComplete="off" placeholder="smtp.hostinger.com" className={fieldClasses()} />
                </div>
                <div>
                  <label htmlFor={ids.port} className="mb-1.5 block text-sm font-medium text-gray-700">{t("port")}</label>
                  <input id={ids.port} value={String(form.port)} onChange={(e) => set("port", Number(e.target.value.replace(/\D/g, "")) || 0)} inputMode="numeric" autoComplete="off" className={fieldClasses()} />
                  <p className="mt-1 text-xs text-gray-600">{t("portHint")}</p>
                </div>
                <div className="flex items-start gap-2 pt-7">
                  <input id={ids.secure} type="checkbox" checked={form.secure} onChange={(e) => set("secure", e.target.checked)} className="mt-1 h-4 w-4" />
                  <label htmlFor={ids.secure} className="text-sm text-gray-800">{t("secure")}<span className="block text-xs text-gray-600">{t("secureHint")}</span></label>
                </div>
                <div>
                  <label htmlFor={ids.user} className="mb-1.5 block text-sm font-medium text-gray-700">{t("username")}</label>
                  <input id={ids.user} value={form.username} onChange={(e) => set("username", e.target.value)} autoComplete="off" className={fieldClasses()} />
                </div>
                <div>
                  <label htmlFor={ids.pass} className="mb-1.5 block text-sm font-medium text-gray-700">{t("password")}</label>
                  <input id={ids.pass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder={form.hasPassword ? t("passwordSaved") : ""} className={fieldClasses()} />
                  <p className="mt-1 text-xs text-gray-600">{t("passwordHint")}</p>
                </div>
                <div>
                  <label htmlFor={ids.fromName} className="mb-1.5 block text-sm font-medium text-gray-700">{t("fromName")}</label>
                  <input id={ids.fromName} value={form.fromName} onChange={(e) => set("fromName", e.target.value)} autoComplete="off" className={fieldClasses()} />
                </div>
                <div>
                  <label htmlFor={ids.fromEmail} className="mb-1.5 block text-sm font-medium text-gray-700">{t("fromEmail")}</label>
                  <input id={ids.fromEmail} type="email" value={form.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} autoComplete="off" placeholder="noreply@theuniqueexpo.com" className={fieldClasses()} />
                </div>
                <div className="flex items-start gap-2 sm:col-span-2">
                  <input id={ids.enabled} type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} className="mt-1 h-4 w-4" />
                  <label htmlFor={ids.enabled} className="text-sm font-semibold text-gray-900">{t("enable")}<span className="block text-xs font-normal text-gray-600">{t("enableHint")}</span></label>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={save} disabled={busy !== ""} variant="save" size="compact">{busy === "save" ? ta("saving") : ta("save")}</Button>
                <Button onClick={sendTest} disabled={busy !== "" || !form.host || !form.fromEmail} variant="secondaryOutline" size="compact">
                  {busy === "test" ? t("sending") : t("sendTest", { email: user.email })}
                </Button>
              </div>
              <p className="mt-2 text-xs text-gray-600">{t("testHint")}</p>
            </div>
          )}

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-bold text-heading">{t("whatTitle")}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
              {["forgot", "registration", "documents", "points"].map((k) => <li key={k}>{t(`what.${k}`)}</li>)}
            </ul>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-bold text-heading">{t("reminders.title")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("reminders.intro")}</p>
            <p className="mt-3 text-sm text-gray-800">
              {reminders?.lastRunAt ? t("reminders.lastRun", { time: reminders.lastRunAt.slice(0, 16).replace("T", " "), count: reminders.lastCount }) : t("reminders.neverRun")}
            </p>
            {reminders?.hasKey && !newKey && <p className="mt-1 text-xs text-gray-600">{t("reminders.hasKey")}</p>}
            {newKey && (
              <div className="mt-3 rounded-lg bg-cream-50 p-3 text-sm">
                <p className="font-semibold text-gray-800">{t("reminders.newKey")}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <code className="break-all rounded bg-white px-2 py-1 text-xs text-gray-900">{newKey}</code>
                  <Button type="button" variant="secondaryOutline" size="xs" onClick={() => navigator.clipboard?.writeText(newKey).then(() => setCopied(true)).catch(() => {})}>{copied ? t("reminders.copied") : t("reminders.copy")}</Button>
                </div>
                <p className="mt-2 text-xs text-gray-700">{t("reminders.howTo")}</p>
              </div>
            )}
            <div className="mt-4">
              <Button type="button" variant="secondaryOutline" size="compact" onClick={makeKey}>{t("reminders.makeKey")}</Button>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-bold text-heading">{t("logTitle")}</h2>
            {log.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">{t("logEmpty")}</p>
            ) : (
              <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label={t("logTitle")}>
                <table className="w-full min-w-[34rem] text-left text-sm">
                  <thead>
                    <tr className="text-xs text-gray-600">
                      <th scope="col" className="py-2 pr-3 font-semibold">{t("logTime")}</th>
                      <th scope="col" className="py-2 pr-3 font-semibold">{t("logTo")}</th>
                      <th scope="col" className="py-2 pr-3 font-semibold">{t("logKind")}</th>
                      <th scope="col" className="py-2 font-semibold">{t("logResult")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {log.map((r) => (
                      <tr key={r.id}>
                        <td className="whitespace-nowrap py-2 pr-3 text-gray-700">{r.createdAt.slice(0, 16).replace("T", " ")}</td>
                        <td className="py-2 pr-3 text-gray-900">{r.toEmail}</td>
                        <td className="py-2 pr-3 text-gray-700">{KINDS.includes(r.kind) ? t(`kinds.${r.kind}`) : r.kind}</td>
                        <td className="py-2">
                          {r.status === "sent" ? (
                            <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-800">{t("sent")}</span>
                          ) : (
                            <span title={r.error}><span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">{t("failed")}</span> <span className="text-xs text-gray-600">{r.error.slice(0, 80)}</span></span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
