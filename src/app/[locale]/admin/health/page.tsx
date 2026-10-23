"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/client/registration-format";
import Button from "@/components/ui/Button";

interface Backup { at: string; sizeBytes: number; name: string }
interface Report { newRegistrations: number; pendingRegistrations: number; emailsSent: number; emailsFailed: number; mailOn: boolean; deployBackup: Backup | null; offsiteBackup: Backup | null; issues: string[] }
interface Overview { available: boolean; enabled: boolean; lastSentOn: string | null; report: Report }

const DAY = 86_400_000;

// How the site is doing: registrations, e-mail failures and database backups. The same numbers go out in the daily e-mail.
export default function AdminHealthPage() {
  const t = useTranslations("adminHealth");
  const ta = useTranslations("adminCommon");
  const locale = useLocale();
  const { user, loading: authLoading } = useAuth();
  const checkId = useId();
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/health", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(t("errors.load")));
  }, [t]);

  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user, load]);

  async function call(method: "PUT" | "POST", body: Record<string, unknown>, ok: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/health", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setData(d);
        setMessage(ok);
      } else setError(t.has(`errors.${d.code}`) ? t(`errors.${d.code}`) : t("errors.failed"));
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-700">{ta("accessRequired")}</p></div>;
  }

  const r = data?.report;
  const size = (n: number) => (n >= 1_048_576 ? t("mb", { n: (n / 1_048_576).toFixed(1) }) : t("kb", { n: Math.max(1, Math.round(n / 1024)) }));
  const backupLine = (b: Backup | null) => (b ? t("backupWhen", { date: formatDateTime(b.at, locale), size: size(b.sizeBytes), days: Math.floor((Date.now() - new Date(b.at).getTime()) / DAY) }) : t("backupNone"));
  const issueText = (issue: string): string => {
    const key = issue.startsWith("No off-site") ? "issueNoOffsite" : issue.startsWith("The last off-site") ? "issueOldOffsite" : issue.startsWith("No backup made") ? "issueNoDeploy" : issue.startsWith("The last backup") ? "issueOldDeploy" : /e-mail/.test(issue) ? "issueFailedMail" : "issueBacklog";
    return t(key, { n: Number(/\d+/.exec(issue)?.[0] ?? 0) });
  };

  return (
    <div>
      <section className="gradient-hero py-10">
        <div className="mx-auto max-w-4xl px-6">
          <Link href="/admin" className="text-sm text-emerald-200 hover:text-white mb-3 inline-block">{t("back")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{t("subtitle")}</p>
        </div>
      </section>
      <section className="py-8 bg-cream-50 min-h-[60vh]">
        <div className="mx-auto max-w-4xl px-6 space-y-6">
          {message && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{message}</p>}
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {!data && !error && <p className="text-gray-700">{ta("loading")}</p>}

          {r && (
            <>
              <div className="rounded-2xl bg-white p-6 shadow-sm" data-testid="health-issues">
                <h2 className="text-lg font-bold text-heading">{r.issues.length > 0 ? t("needsAttention") : t("allFine")}</h2>
                {r.issues.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">{r.issues.map((i) => <li key={i}>{issueText(i)}</li>)}</ul>}
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm" data-testid="health-numbers">
                <h2 className="text-lg font-bold text-heading">{t("last24")}</h2>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                  <div><dt className="text-gray-700">{t("newRegistrations")}</dt><dd className="text-2xl font-extrabold text-heading">{r.newRegistrations}</dd></div>
                  <div><dt className="text-gray-700">{t("pending")}</dt><dd className="text-2xl font-extrabold text-heading">{r.pendingRegistrations}</dd></div>
                  <div><dt className="text-gray-700">{t("emailsSent")}</dt><dd className="text-2xl font-extrabold text-heading">{r.emailsSent}</dd></div>
                  <div><dt className="text-gray-700">{t("emailsFailed")}</dt><dd className="text-2xl font-extrabold text-heading">{r.emailsFailed}</dd></div>
                </dl>
                {!r.mailOn && <p role="note" className="mt-3 text-sm text-amber-900">{t("mailOff")} <Link href="/admin/email" className="font-semibold underline">{t("openEmail")}</Link></p>}
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm" data-testid="health-backups">
                <h2 className="text-lg font-bold text-heading">{t("backups")}</h2>
                <dl className="mt-3 space-y-3 text-sm">
                  <div><dt className="font-semibold text-gray-800">{t("deployBackup")}</dt><dd className="text-gray-700">{backupLine(r.deployBackup)}</dd></div>
                  <div><dt className="font-semibold text-gray-800">{t("offsiteBackup")}</dt><dd className="text-gray-700">{backupLine(r.offsiteBackup)}</dd></div>
                </dl>
                <p className="mt-3 text-xs text-gray-600">{t("backupHelp")}</p>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm space-y-3" data-testid="health-email">
                <h2 className="text-lg font-bold text-heading">{t("emailTitle")}</h2>
                <div className="flex items-start gap-3">
                  <input id={checkId} type="checkbox" checked={data.enabled} disabled={busy || !data.available} onChange={(e) => call("PUT", { enabled: e.target.checked }, t("saved"))} className="mt-1 h-4 w-4" />
                  <label htmlFor={checkId} className="text-sm text-heading">{t("emailEnable")}</label>
                </div>
                <p className="text-xs text-gray-600">{data.lastSentOn ? t("lastSent", { date: data.lastSentOn }) : t("neverSent")}</p>
                <Button type="button" variant="secondaryOutline" size="compact" disabled={busy || !r.mailOn} onClick={() => call("POST", { action: "send" }, t("sentToYou", { email: user.email }))}>{busy ? t("sending") : t("sendNow")}</Button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
