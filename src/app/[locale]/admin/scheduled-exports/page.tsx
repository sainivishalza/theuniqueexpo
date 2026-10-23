"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/client/registration-format";
import { fieldClasses } from "@/components/ui/FormField";
import Button from "@/components/ui/Button";

interface Report {
  id: number; name: string; kind: "registrations" | "withdrawals" | "movements"; filters: Record<string, string>;
  frequency: "daily" | "weekly" | "monthly"; weekday: number; monthDay: number; recipients: string[]; enabled: boolean; lastSentAt: string | null; lastStatus: string;
}
interface Form { name: string; kind: Report["kind"]; exhibition: string; status: string; wStatus: string; frequency: Report["frequency"]; weekday: string; monthDay: string; recipients: string; enabled: boolean }

const BLANK: Form = { name: "", kind: "registrations", exhibition: "", status: "", wStatus: "pending", frequency: "weekly", weekday: "1", monthDay: "1", recipients: "", enabled: true };
const STATUSES = ["pending", "approved", "confirmed", "attended", "rejected", "cancelled", "absent", "expired"];

// Excel reports sent to chosen people by e-mail on a schedule.
export default function AdminScheduledExportsPage() {
  const t = useTranslations("adminScheduledExports");
  const tr = useTranslations("adminRegistrationsCommon");
  const ta = useTranslations("adminCommon");
  const locale = useLocale();
  const { user, loading: authLoading } = useAuth();
  const ids = { name: useId(), kind: useId(), expo: useId(), status: useId(), wstatus: useId(), freq: useId(), weekday: useId(), monthday: useId(), to: useId() };
  const [reports, setReports] = useState<Report[] | null>(null);
  const [mailOn, setMailOn] = useState(true);
  const [expos, setExpos] = useState<{ slug: string; title: string }[]>([]);
  const [form, setForm] = useState<Form>(BLANK);
  const [editing, setEditing] = useState<number | null>(null);
  const [askDelete, setAskDelete] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/scheduled-exports", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setReports(d.exports ?? []); setMailOn(!!d.mailOn); })
      .catch(() => setError(t("errors.load")));
  }, [t]);

  useEffect(() => {
    if (user?.role !== "admin") return;
    load();
    fetch("/api/admin/buyer-profiles/announce/segment").then((r) => (r.ok ? r.json() : null)).then((d) => d && setExpos(d.exhibitions ?? [])).catch(() => {});
  }, [user, load]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  function body(f: Form, enabled = f.enabled) {
    return {
      name: f.name, kind: f.kind, frequency: f.frequency, weekday: Number(f.weekday), monthDay: Number(f.monthDay), recipients: f.recipients, enabled,
      filters: f.kind === "registrations" ? { exhibition: f.exhibition, status: f.status } : f.kind === "withdrawals" ? { status: f.wStatus } : {},
    };
  }

  function fromReport(r: Report): Form {
    return { name: r.name, kind: r.kind, exhibition: r.filters.exhibition ?? "", status: r.filters.status ?? "", wStatus: r.kind === "withdrawals" ? r.filters.status ?? "pending" : "pending", frequency: r.frequency, weekday: String(r.weekday), monthDay: String(r.monthDay), recipients: r.recipients.join("\n"), enabled: r.enabled };
  }

  async function call(url: string, method: string, payload?: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: payload ? JSON.stringify(payload) : undefined });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && !(data && data.status)) setError(t.has(`errors.${data.code}`) ? t(`errors.${data.code}`) : t("errors.failed"));
      return { ok: res.ok, data };
    } catch {
      setError(t("errors.failed"));
      return { ok: false, data: {} };
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = editing ? await call(`/api/admin/scheduled-exports/${editing}`, "PUT", body(form)) : await call("/api/admin/scheduled-exports", "POST", body(form));
    if (r.ok) {
      setReports((r.data.exports as Report[]) ?? []);
      setMessage(editing ? t("updated") : t("created"));
      setForm(BLANK);
      setEditing(null);
    }
  }

  async function toggle(r: Report) {
    const res = await call(`/api/admin/scheduled-exports/${r.id}`, "PUT", body(fromReport(r), !r.enabled));
    if (res.ok) { setReports((res.data.exports as Report[]) ?? []); setMessage(r.enabled ? t("paused") : t("resumed")); }
  }

  async function sendNow(r: Report) {
    const res = await call(`/api/admin/scheduled-exports/${r.id}/send`, "POST");
    if (res.data.exports) setReports(res.data.exports as Report[]);
    if (res.ok) setMessage(t("sentNow", { name: r.name }));
    else if (res.data.status) setError(t(`status.${String(res.data.status)}`));
  }

  async function remove(r: Report) {
    const res = await call(`/api/admin/scheduled-exports/${r.id}`, "DELETE");
    if (res.ok) { setReports((res.data.exports as Report[]) ?? []); setMessage(t("deleted")); }
    setAskDelete(null);
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{ta("accessRequired")}</p></div>;
  }
  const field = fieldClasses();
  const days = [0, 1, 2, 3, 4, 5, 6];

  return (
    <div>
      <section className="gradient-hero py-10">
        <div className="mx-auto max-w-5xl px-6">
          <Link href="/admin" className="text-sm text-emerald-200 hover:text-white mb-3 inline-block">{t("back")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{t("subtitle")}</p>
        </div>
      </section>
      <section className="py-8 bg-cream-50 min-h-[60vh]">
        <div className="mx-auto max-w-5xl px-6 space-y-6">
          {!mailOn && <p role="note" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">{t("mailOff")} <Link href="/admin/email" className="font-semibold underline">{t("openEmail")}</Link></p>}
          {message && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{message}</p>}
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <form onSubmit={save} className="rounded-2xl bg-white p-6 shadow-sm space-y-4" data-testid="report-form">
            <h2 className="text-lg font-bold text-heading">{editing ? t("editReport") : t("newReport")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={ids.name} className="mb-1.5 block text-sm font-medium text-gray-700">{t("name")}</label>
                <input id={ids.name} value={form.name} maxLength={100} onChange={(e) => set("name", e.target.value)} className={field} />
              </div>
              <div>
                <label htmlFor={ids.kind} className="mb-1.5 block text-sm font-medium text-gray-700">{t("what")}</label>
                <select id={ids.kind} value={form.kind} onChange={(e) => set("kind", e.target.value as Report["kind"])} className={field}>
                  {(["registrations", "withdrawals", "movements"] as const).map((k) => <option key={k} value={k}>{t(`kinds.${k}`)}</option>)}
                </select>
              </div>
              {form.kind === "registrations" && (
                <>
                  <div>
                    <label htmlFor={ids.expo} className="mb-1.5 block text-sm font-medium text-gray-700">{t("exhibition")}</label>
                    <select id={ids.expo} value={form.exhibition} onChange={(e) => set("exhibition", e.target.value)} className={field}>
                      <option value="">{t("allExhibitions")}</option>
                      {expos.map((x) => <option key={x.slug} value={x.slug}>{x.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={ids.status} className="mb-1.5 block text-sm font-medium text-gray-700">{t("status")}</label>
                    <select id={ids.status} value={form.status} onChange={(e) => set("status", e.target.value)} className={field}>
                      <option value="">{t("anyStatus")}</option>
                      {STATUSES.map((s) => <option key={s} value={s}>{tr(`statuses.${s}`)}</option>)}
                    </select>
                  </div>
                </>
              )}
              {form.kind === "withdrawals" && (
                <div>
                  <label htmlFor={ids.wstatus} className="mb-1.5 block text-sm font-medium text-gray-700">{t("withdrawalStatus")}</label>
                  <select id={ids.wstatus} value={form.wStatus} onChange={(e) => set("wStatus", e.target.value)} className={field}>
                    {["pending", "paid", "rejected", "all"].map((s) => <option key={s} value={s}>{t(`withdrawalStatuses.${s}`)}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor={ids.freq} className="mb-1.5 block text-sm font-medium text-gray-700">{t("how")}</label>
                <select id={ids.freq} value={form.frequency} onChange={(e) => set("frequency", e.target.value as Report["frequency"])} className={field}>
                  {(["daily", "weekly", "monthly"] as const).map((f) => <option key={f} value={f}>{t(`frequencies.${f}`)}</option>)}
                </select>
              </div>
              {form.frequency === "weekly" && (
                <div>
                  <label htmlFor={ids.weekday} className="mb-1.5 block text-sm font-medium text-gray-700">{t("weekday")}</label>
                  <select id={ids.weekday} value={form.weekday} onChange={(e) => set("weekday", e.target.value)} className={field}>
                    {days.map((d) => <option key={d} value={d}>{t(`weekdays.${d}`)}</option>)}
                  </select>
                </div>
              )}
              {form.frequency === "monthly" && (
                <div>
                  <label htmlFor={ids.monthday} className="mb-1.5 block text-sm font-medium text-gray-700">{t("monthDay")}</label>
                  <select id={ids.monthday} value={form.monthDay} onChange={(e) => set("monthDay", e.target.value)} className={field}>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div>
              <label htmlFor={ids.to} className="mb-1.5 block text-sm font-medium text-gray-700">{t("recipients")}</label>
              <textarea id={ids.to} rows={3} value={form.recipients} onChange={(e) => set("recipients", e.target.value)} className={`${field} resize-none`} />
              <p className="mt-1 text-xs text-gray-600">{t("recipientsHint")}</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-800"><input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} className="h-4 w-4 rounded border-gray-300" />{t("enabled")}</label>
            <p className="text-xs text-gray-600">{t("timeNote")}</p>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="save" size="compact" disabled={busy || !form.name.trim() || !form.recipients.trim()}>{busy ? ta("saving") : editing ? t("saveChanges") : t("create")}</Button>
              {editing && <Button type="button" variant="secondaryOutline" size="compact" onClick={() => { setEditing(null); setForm(BLANK); }}>{ta("cancel")}</Button>}
            </div>
          </form>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-heading">{t("yourReports")}</h2>
            {reports && reports.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-gray-700 shadow-sm" data-testid="no-reports">{t("none")}</p>}
            {reports?.map((r) => (
              <div key={r.id} className="rounded-2xl bg-white p-5 shadow-sm" data-testid="report" data-id={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-heading [overflow-wrap:anywhere]">{r.name}{!r.enabled && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">{t("pausedBadge")}</span>}</h3>
                    <p className="text-sm text-gray-700">{t(`kinds.${r.kind}`)} · {t(`frequencies.${r.frequency}`)}{r.frequency === "weekly" ? ` (${t(`weekdays.${r.weekday}`)})` : r.frequency === "monthly" ? ` (${r.monthDay})` : ""}</p>
                    <p className="text-sm text-gray-600 [overflow-wrap:anywhere]">{t("to")} {r.recipients.join(", ")}</p>
                    <p className="text-xs text-gray-600">{r.lastSentAt ? t("last", { when: formatDateTime(r.lastSentAt, locale), status: r.lastStatus && t.has(`status.${r.lastStatus}`) ? t(`status.${r.lastStatus}`) : r.lastStatus }) : t("neverSent")}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="secondaryOutline" size="xs" disabled={busy || !mailOn} onClick={() => sendNow(r)}>{t("sendNow")}</Button>
                    <Button type="button" variant="secondaryOutline" size="xs" disabled={busy} onClick={() => toggle(r)}>{r.enabled ? t("pause") : t("resume")}</Button>
                    <Button type="button" variant="secondaryOutline" size="xs" disabled={busy} onClick={() => { setEditing(r.id); setForm(fromReport(r)); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{t("edit")}</Button>
                    {askDelete === r.id ? (
                      <span className="flex flex-wrap items-center gap-2" role="group" aria-label={t("deleteQuestion")}>
                        <span className="text-sm text-gray-700">{t("deleteQuestion")}</span>
                        <Button type="button" variant="ghostDanger" size="xs" disabled={busy} onClick={() => remove(r)}>{t("deleteYes")}</Button>
                        <Button type="button" variant="secondaryOutline" size="xs" onClick={() => setAskDelete(null)}>{t("deleteKeep")}</Button>
                      </span>
                    ) : (
                      <Button type="button" variant="ghostDanger" size="xs" disabled={busy} onClick={() => setAskDelete(r.id)}>{t("delete")}</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
