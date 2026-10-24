"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDateRange } from "@/lib/date-format";
import { fieldClasses } from "@/components/ui/FormField";
import { formatNumber } from "@/lib/format";
import { errorKey, walletApi } from "@/lib/client/wallet-client";
import { REFERRAL_TRIGGERS, type ReferralSettings, type ReferralStatus } from "@/lib/referral";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { DownloadExcel, STATUS_TONE } from "./shared";

interface Row {
  id: number;
  status: ReferralStatus;
  referrerName: string;
  referrerNumber: string;
  referredName: string;
  referredNumber: string;
  referrerPoints: number;
  referredPoints: number;
  exhibitionTitle: string;
  note: string;
  createdAt: string;
}
interface ExpoRow { id: number; title: string; startDate: string; endDate: string; referrerPoints: number | null; referredPoints: number | null }
interface Listing {
  settings: ReferralSettings;
  exhibitions: ExpoRow[];
  items: Row[];
  hasMore: boolean;
  totals: { pending: number; rewarded: number; rejected: number; pointsPaid: number };
}

const TRIGGER_KEY = { signup: "triggerSignup", approved: "triggerApproved", attended: "triggerAttended" } as const;
const STATUS_KEY = { pending: "statusPending", rewarded: "statusRewarded", rejected: "statusRejected" } as const;

// The referral programme's rules (on/off, when the points are paid, how many, the cap per buyer) and every referral.
export default function ReferralsTab() {
  const t = useTranslations("adminWallet");
  const tr = useTranslations("adminWallet.referrals");
  const locale = useLocale();
  const ids = { expoSearch: useId(), enabled: useId(), trigger: useId(), mine: useId(), theirs: useId(), cap: useId(), filter: useId(), search: useId() };
  const [form, setForm] = useState<ReferralSettings | null>(null);
  const [texts, setTexts] = useState({ referrerPoints: "", referredPoints: "", maxPerReferrer: "" });
  const [list, setList] = useState<Listing | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [settled, setSettled] = useState("");
  const [expos, setExpos] = useState<ExpoRow[]>([]);
  const [expoText, setExpoText] = useState<Record<number, { a: string; b: string }>>({});
  const [expoSaved, setExpoSaved] = useState<number | null>(null);
  const [expoFilter, setExpoFilter] = useState("");

  const load = useCallback(
    async (before?: number) => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (query.trim()) params.set("q", query.trim());
      if (before) params.set("before", String(before));
      const res = await walletApi<Listing>(`/api/admin/wallet/referrals?${params}`);
      if (!res.ok) {
        setMessage(t(`errors.${errorKey(res.data.code)}`));
        return;
      }
      setMessage("");
      setList(res.data);
      setRows((prev) => (before ? [...prev, ...res.data.items] : res.data.items));
      return res.data;
    },
    [status, query, t]
  );

  // The rules are read once; the list reloads when the filter changes.
  useEffect(() => {
    let stale = false;
    walletApi<Listing>("/api/admin/wallet/referrals?status=none").then((res) => {
      if (stale || !res.ok) return;
      setForm(res.data.settings);
      setTexts({ referrerPoints: String(res.data.settings.referrerPoints), referredPoints: String(res.data.settings.referredPoints), maxPerReferrer: String(res.data.settings.maxPerReferrer) });
      setExpos(res.data.exhibitions);
      setExpoText(Object.fromEntries(res.data.exhibitions.map((x) => [x.id, { a: x.referrerPoints === null ? "" : String(x.referrerPoints), b: x.referredPoints === null ? "" : String(x.referredPoints) }])));
    });
    return () => {
      stale = true;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 250);
    return () => clearTimeout(timer);
  }, [load]);

  if (!form) return <p className={message ? "text-red-700" : "text-gray-600"} role={message ? "alert" : undefined}>{message || t("loading")}</p>;

  const num = (s: string) => (/^\d{1,6}$/.test(s.trim()) ? Number(s.trim()) : null);
  const referrerPoints = num(texts.referrerPoints);
  const referredPoints = num(texts.referredPoints);
  const maxPerReferrer = num(texts.maxPerReferrer);
  const valid = referrerPoints !== null && referredPoints !== null && maxPerReferrer !== null && referrerPoints <= 100_000 && referredPoints <= 100_000 && maxPerReferrer <= 10_000 && !(form.enabled && referrerPoints === 0 && referredPoints === 0);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || !form) return;
    setBusy(true);
    setMessage("");
    setSaved(false);
    const res = await walletApi("/api/admin/wallet/referrals", { method: "PUT", body: { ...form, referrerPoints, referredPoints, maxPerReferrer } });
    setBusy(false);
    if (!res.ok) {
      setMessage(t(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setSaved(true);
  }

  async function settle() {
    setBusy(true);
    setSettled("");
    const res = await walletApi<{ paid: number; limited: number }>("/api/admin/wallet/referrals", { method: "POST", body: { action: "settle" } });
    setBusy(false);
    if (!res.ok) {
      setMessage(t(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setSettled(tr("settled", { paid: res.data.paid, limited: res.data.limited }));
    load();
  }

  async function reject(id: number) {
    if (!window.confirm(tr("rejectConfirm"))) return;
    const res = await walletApi("/api/admin/wallet/referrals", { method: "POST", body: { action: "reject", id } });
    if (!res.ok) {
      setMessage(t(`errors.${errorKey(res.data.code)}`));
      return;
    }
    load();
  }

  const totals = list?.totals;

  // "" = use the default; otherwise a whole number 0..100000.
  const expoValue = (text: string): number | null | undefined => (text.trim() === "" ? null : /^\d{1,6}$/.test(text.trim()) && Number(text.trim()) <= 100_000 ? Number(text.trim()) : undefined);

  async function saveExpo(id: number) {
    const text = expoText[id];
    const referrerPoints = expoValue(text.a);
    const referredPoints = expoValue(text.b);
    if (referrerPoints === undefined || referredPoints === undefined) return;
    setExpoSaved(null);
    const res = await walletApi("/api/admin/wallet/referrals", { method: "POST", body: { action: "exhibition", id, referrerPoints, referredPoints } });
    if (!res.ok) {
      setMessage(t(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setMessage("");
    setExpoSaved(id);
  }

  const shownExpos = expos.filter((x) => x.title.toLowerCase().includes(expoFilter.trim().toLowerCase()));

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="space-y-4" data-testid="referral-form">
        <Card shadow="sm" bordered={false} className="p-5 space-y-4">
          <h2 className="text-lg font-bold text-heading">{tr("title")}</h2>
          <p className="text-sm text-gray-700">{tr("intro")}</p>
          <label htmlFor={ids.enabled} className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <input id={ids.enabled} type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="h-4 w-4" />
            {tr("enabled")}
          </label>
          <div>
            <label htmlFor={ids.trigger} className="block text-sm font-medium text-gray-700 mb-1.5">{tr("trigger")}</label>
            <select id={ids.trigger} value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value as ReferralSettings["trigger"] })} className={fieldClasses()}>
              {REFERRAL_TRIGGERS.map((key) => (
                <option key={key} value={key}>{tr(TRIGGER_KEY[key])}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor={ids.mine} className="block text-sm font-medium text-gray-700 mb-1.5">{tr("referrerPoints")}</label>
              <input id={ids.mine} inputMode="numeric" value={texts.referrerPoints} onChange={(e) => setTexts((p) => ({ ...p, referrerPoints: e.target.value }))} className={fieldClasses(referrerPoints === null || referrerPoints > 100_000)} />
            </div>
            <div>
              <label htmlFor={ids.theirs} className="block text-sm font-medium text-gray-700 mb-1.5">{tr("referredPoints")}</label>
              <input id={ids.theirs} inputMode="numeric" value={texts.referredPoints} onChange={(e) => setTexts((p) => ({ ...p, referredPoints: e.target.value }))} className={fieldClasses(referredPoints === null || referredPoints > 100_000)} />
            </div>
            <div>
              <label htmlFor={ids.cap} className="block text-sm font-medium text-gray-700 mb-1.5">{tr("maxPerReferrer")}</label>
              <input id={ids.cap} inputMode="numeric" value={texts.maxPerReferrer} onChange={(e) => setTexts((p) => ({ ...p, maxPerReferrer: e.target.value }))} className={fieldClasses(maxPerReferrer === null || maxPerReferrer > 10_000)} />
            </div>
          </div>
          <p className="text-xs text-gray-600">{tr("hint")}</p>
        </Card>
        {message && <p role="alert" className="text-red-700">{message}</p>}
        {saved && <p role="status" className="text-green-800" data-testid="referral-saved">{tr("saved")}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="gradientCta" size="wide" disabled={busy || !valid}>{busy ? t("saving") : t("save")}</Button>
          <Button type="button" variant="secondaryOutline" disabled={busy} onClick={settle} data-testid="referral-settle">{tr("settle")}</Button>
        </div>
        <p className="text-xs text-gray-600">{tr("settleHint")}</p>
        {settled && <p role="status" className="text-green-800" data-testid="referral-settled">{settled}</p>}
      </form>

      <Card shadow="sm" bordered={false} className="p-5 space-y-4" data-testid="referral-expos">
        <h2 className="text-lg font-bold text-heading">{tr("byExpoTitle")}</h2>
        <p className="text-sm text-gray-700">{tr("byExpoHint")}</p>
        <div>
          <label htmlFor={ids.expoSearch} className="block text-xs font-medium text-gray-700 mb-1">{tr("byExpoSearch")}</label>
          <input id={ids.expoSearch} type="search" value={expoFilter} onChange={(e) => setExpoFilter(e.target.value)} className={fieldClasses()} />
        </div>
        {shownExpos.length === 0 ? (
          <p className="text-gray-700">{tr("noExpos")}</p>
        ) : (
          <ul className="space-y-3">
            {shownExpos.map((x) => {
              const text = expoText[x.id] ?? { a: "", b: "" };
              const badA = expoValue(text.a) === undefined;
              const badB = expoValue(text.b) === undefined;
              const setText = (patch: Partial<{ a: string; b: string }>) => {
                setExpoSaved(null);
                setExpoText((p) => ({ ...p, [x.id]: { ...text, ...patch } }));
              };
              return (
                <li key={x.id} data-testid={`referral-expo-${x.id}`} className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="font-bold text-heading [overflow-wrap:anywhere]">{x.title}</p>
                  <p className="text-xs text-gray-700">{formatDateRange(x.startDate, x.endDate, locale)}</p>
                  <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <input aria-label={tr("rowInviter", { title: x.title })} inputMode="numeric" value={text.a} placeholder={tr("useDefault", { points: form.referrerPoints })} onChange={(e) => setText({ a: e.target.value })} className={fieldClasses(badA)} />
                    <input aria-label={tr("rowNewBuyer", { title: x.title })} inputMode="numeric" value={text.b} placeholder={tr("useDefault", { points: form.referredPoints })} onChange={(e) => setText({ b: e.target.value })} className={fieldClasses(badB)} />
                    <div className="col-span-2 flex items-center gap-3 sm:col-span-1">
                      <Button type="button" variant="secondaryOutline" size="xs" disabled={badA || badB} onClick={() => saveExpo(x.id)} aria-label={tr("rowSave", { title: x.title })}>{t("save")}</Button>
                      {expoSaved === x.id && <span role="status" className="text-sm text-green-800">{tr("rowSaved")}</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {totals && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="referral-totals">
          {([["waiting", totals.pending, "pending"], ["rewardedCount", totals.rewarded, "rewarded"], ["rejectedCount", totals.rejected, "rejected"], ["pointsPaid", totals.pointsPaid, "points"]] as const).map(([key, value, id]) => (
            <Card key={key} shadow="sm" bordered={false} className="p-4 text-center">
              <p className="text-2xl font-extrabold text-heading" data-testid={`referral-total-${id}`}>{formatNumber(value)}</p>
              <p className="text-xs font-semibold text-gray-700">{tr(key)}</p>
            </Card>
          ))}
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-heading">{tr("listTitle")}</h2>
          <DownloadExcel path="/api/admin/wallet/export/referrals" fallbackName="referrals.xlsx" label={t("export.referrals")} />
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <div>
            <label htmlFor={ids.filter} className="block text-xs font-medium text-gray-700 mb-1">{tr("filterLabel")}</label>
            <select id={ids.filter} value={status} onChange={(e) => setStatus(e.target.value)} className={fieldClasses()}>
              <option value="">{t("all")}</option>
              {(["pending", "rewarded", "rejected"] as const).map((key) => (
                <option key={key} value={key}>{tr(STATUS_KEY[key])}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[12rem] flex-1">
            <label htmlFor={ids.search} className="block text-xs font-medium text-gray-700 mb-1">{tr("searchLabel")}</label>
            <input id={ids.search} type="search" value={query} onChange={(e) => setQuery(e.target.value)} className={fieldClasses()} />
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="mt-4 text-gray-700" data-testid="referral-empty">{tr("empty")}</p>
        ) : (
          <ul className="mt-4 space-y-2" data-testid="referral-list">
            {rows.map((r) => (
              <li key={r.id} data-testid={`referral-${r.id}`}>
                <Card shadow="sm" bordered={false} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1 text-sm">
                      <p><span className="text-gray-700">{tr("invitedBy")}: </span><span className="font-bold text-heading [overflow-wrap:anywhere]">{r.referrerName} {r.referrerNumber}</span></p>
                      <p><span className="text-gray-700">{tr("newBuyer")}: </span><span className="font-bold text-heading [overflow-wrap:anywhere]">{r.referredName} {r.referredNumber}</span></p>
                      {r.status === "rewarded" && <p className="text-green-800">{tr("paid", { mine: formatNumber(r.referrerPoints), theirs: formatNumber(r.referredPoints) })}</p>}
                      {r.status === "rewarded" && r.exhibitionTitle && <p className="text-gray-700 [overflow-wrap:anywhere]">{tr("viaExpo", { title: r.exhibitionTitle })}</p>}
                      {r.note && <p className="text-gray-700 [overflow-wrap:anywhere]">{r.note}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={STATUS_TONE[r.status] ?? "gray"}>{tr(STATUS_KEY[r.status])}</Badge>
                      {r.status === "pending" && <Button type="button" variant="linkDanger" size="xs" onClick={() => reject(r.id)} data-testid={`referral-reject-${r.id}`}>{t("reject")}</Button>}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
        {list?.hasMore && rows.length > 0 && (
          <div className="mt-4">
            <Button type="button" variant="secondaryOutline" onClick={() => load(rows[rows.length - 1].id)}>{t("showMore")}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
