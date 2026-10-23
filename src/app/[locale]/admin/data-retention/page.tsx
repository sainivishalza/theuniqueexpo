"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/client/registration-format";
import { fieldClasses } from "@/components/ui/FormField";
import Button from "@/components/ui/Button";

interface Preview { profiles: number; files: number; registrations: number }
interface Run { id: number; runAt: string; trigger: "auto" | "manual"; days: number; profilesCleared: number; filesRemoved: number; registrationsCleared: number }
interface Overview { available: boolean; settings: { enabled: boolean; days: number }; options: number[]; preview: Preview; previewDays: number; runs: Run[] }

// When identity documents (passport page, visa page, entry stamp) are deleted after an exhibition is over.
export default function AdminDataRetentionPage() {
  const t = useTranslations("adminDataRetention");
  const ta = useTranslations("adminCommon");
  const locale = useLocale();
  const { user, loading: authLoading } = useAuth();
  const ids = { days: useId(), on: useId() };
  const [data, setData] = useState<Overview | null>(null);
  const [days, setDays] = useState(90);
  const [enabled, setEnabled] = useState(false);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const apply = useCallback((d: Overview) => {
    setData(d);
    setDays(d.settings.days);
    setEnabled(d.settings.enabled);
  }, []);

  useEffect(() => {
    if (user?.role !== "admin") return;
    fetch("/api/admin/data-retention", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(apply)
      .catch(() => setError(t("errors.load")));
  }, [user, apply, t]);

  async function changeDays(value: number) {
    setDays(value);
    const r = await fetch(`/api/admin/data-retention?days=${value}`, { cache: "no-store" });
    if (r.ok) setData(await r.json());
  }

  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/data-retention", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled, days }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        apply(d);
        setMessage(t("saved"));
      } else setError(t.has(`errors.${d.code}`) ? t(`errors.${d.code}`) : t("errors.failed"));
    } finally {
      setBusy(false);
    }
  }

  async function runNow() {
    setBusy(true);
    setError("");
    setMessage("");
    setAsking(false);
    try {
      const res = await fetch("/api/admin/data-retention", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "run", days }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        apply({ ...d, settings: data?.settings ?? d.settings });
        setMessage(t("done", { profiles: d.result.profiles, files: d.result.files, registrations: d.result.registrations }));
      } else setError(t.has(`errors.${d.code}`) ? t(`errors.${d.code}`) : t("errors.failed"));
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-700">{ta("accessRequired")}</p></div>;
  }
  const field = fieldClasses();
  const preview = data?.preview;
  const nothing = !!preview && preview.profiles === 0 && preview.registrations === 0;

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
          <div className="rounded-2xl bg-white p-6 shadow-sm space-y-2 text-sm text-gray-700">
            <h2 className="text-lg font-bold text-heading">{t("rulesTitle")}</h2>
            <p>{t("rulesWhat")}</p>
            <p>{t("rulesWhen")}</p>
            <p>{t("rulesSafe")}</p>
            <p>{t("rulesStays")}</p>
          </div>
          {message && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{message}</p>}
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {data && !data.available && <p role="note" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">{t("unavailable")}</p>}

          {data && (
            <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4" data-testid="retention-settings">
              <div className="flex items-start gap-3">
                <input id={ids.on} type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="mt-1 h-4 w-4" />
                <label htmlFor={ids.on} className="text-sm font-semibold text-heading">{t("enable")}</label>
              </div>
              <div className="max-w-xs">
                <label htmlFor={ids.days} className="mb-1 block text-sm font-medium text-gray-700">{t("after")}</label>
                <select id={ids.days} value={days} onChange={(e) => changeDays(Number(e.target.value))} className={field}>
                  {data.options.map((d) => <option key={d} value={d}>{t("days", { days: d })}</option>)}
                </select>
              </div>
              <Button type="button" variant="save" size="compact" disabled={busy || !data.available} onClick={save}>{busy ? ta("saving") : ta("save")}</Button>
              <p className="text-xs text-gray-600">{enabled ? t("stateOn") : t("stateOff")}</p>
            </div>
          )}

          {data && preview && (
            <div className="rounded-2xl bg-white p-6 shadow-sm space-y-3" data-testid="retention-preview">
              <h2 className="text-lg font-bold text-heading">{t("dueTitle", { days: data.previewDays })}</h2>
              <p className="text-sm text-gray-700">{nothing ? t("dueNone") : t("due", { profiles: preview.profiles, files: preview.files, registrations: preview.registrations })}</p>
              {asking ? (
                <div role="group" aria-label={t("confirmTitle")} className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" data-testid="retention-confirm">
                  <p className="font-semibold">{t("confirm", { profiles: preview.profiles, registrations: preview.registrations })}</p>
                  <p className="mt-1">{t("cannotUndo")}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Button type="button" variant="save" size="compact" disabled={busy} onClick={runNow}>{busy ? t("deleting") : t("yesDelete")}</Button>
                    <Button type="button" variant="secondaryOutline" size="compact" disabled={busy} onClick={() => setAsking(false)}>{t("cancel")}</Button>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="secondaryOutline" size="compact" disabled={busy || nothing || !data.available} onClick={() => setAsking(true)}>{t("deleteNow")}</Button>
              )}
            </div>
          )}

          {data && (
            <div className="rounded-2xl bg-white p-6 shadow-sm" data-testid="retention-runs">
              <h2 className="text-lg font-bold text-heading">{t("runsTitle")}</h2>
              {data.runs.length === 0 ? (
                <p className="mt-2 text-sm text-gray-700">{t("runsNone")}</p>
              ) : (
                <ul className="mt-2 divide-y divide-gray-100 text-sm">
                  {data.runs.map((r) => (
                    <li key={r.id} className="py-2 text-gray-700 [overflow-wrap:anywhere]">
                      {t("run", { date: formatDateTime(r.runAt, locale), kind: t(`kind.${r.trigger}`), days: r.days, profiles: r.profilesCleared, files: r.filesRemoved, registrations: r.registrationsCleared })}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
