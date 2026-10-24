"use client";

import { useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDateRange } from "@/lib/date-format";
import { fieldClasses } from "@/components/ui/FormField";
import { errorKey, walletApi } from "@/lib/client/wallet-client";
import type { RefundMode } from "@/lib/ticket-refund";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { DownloadExcel } from "./shared";

interface Row { id: number; title: string; startDate: string; endDate: string; mode: RefundMode; percent: number; maxPoints: number }
interface Draft { mode: RefundMode; percent: string; max: string }

// Per exhibition: do we arrange the transport (nothing to refund), or are train tickets the buyers buy themselves
// refunded in points -- and how much of the price, up to how many points.
export default function TicketRefundsTab() {
  const t = useTranslations("adminWallet");
  const tr = useTranslations("adminWallet.ticketRefunds");
  const locale = useLocale();
  const searchId = useId();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [filter, setFilter] = useState("");
  const [saved, setSaved] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let stale = false;
    walletApi<{ exhibitions: Row[] }>("/api/admin/wallet/ticket-refunds").then((res) => {
      if (stale) return;
      if (!res.ok) {
        setMessage(t(`errors.${errorKey(res.data.code)}`));
        return;
      }
      setRows(res.data.exhibitions);
      setDrafts(Object.fromEntries(res.data.exhibitions.map((x) => [x.id, { mode: x.mode, percent: String(x.percent), max: String(x.maxPoints) }])));
    });
    return () => {
      stale = true;
    };
  }, [t]);

  if (!rows) return <p className={message ? "text-red-700" : "text-gray-600"} role={message ? "alert" : undefined}>{message || t("loading")}</p>;

  const valid = (d: Draft) => /^\d{1,3}$/.test(d.percent.trim()) && Number(d.percent) >= 1 && Number(d.percent) <= 100 && /^\d{1,7}$/.test(d.max.trim()) && Number(d.max) <= 1_000_000;

  async function save(row: Row) {
    const d = drafts[row.id];
    if (!d || !valid(d)) return;
    setSaved(null);
    const res = await walletApi("/api/admin/wallet/ticket-refunds", { method: "PUT", body: { id: row.id, mode: d.mode, percent: Number(d.percent), maxPoints: Number(d.max) } });
    if (!res.ok) {
      setMessage(t(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setMessage("");
    setSaved(row.id);
  }

  const shown = rows.filter((x) => x.title.toLowerCase().includes(filter.trim().toLowerCase()));

  return (
    <div className="space-y-4" data-testid="ticket-rules">
      <Card shadow="sm" bordered={false} className="p-5 space-y-3">
        <h2 className="text-lg font-bold text-heading">{tr("title")}</h2>
        <p className="text-sm text-gray-700">{tr("intro")}</p>
        <p className="text-xs text-gray-600">{tr("hint")}</p>
        <DownloadExcel path="/api/admin/wallet/export/ticket-refunds" fallbackName="ticket-refunds.xlsx" label={t("export.ticketRefunds")} />
        <div>
          <label htmlFor={searchId} className="block text-xs font-medium text-gray-700 mb-1">{tr("search")}</label>
          <input id={searchId} type="search" value={filter} onChange={(e) => setFilter(e.target.value)} className={fieldClasses()} />
        </div>
      </Card>
      {message && <p role="alert" className="text-red-700">{message}</p>}
      {shown.length === 0 ? (
        <p className="text-gray-700">{tr("empty")}</p>
      ) : (
        <ul className="space-y-3">
          {shown.map((x) => {
            const d = drafts[x.id] ?? { mode: x.mode, percent: String(x.percent), max: String(x.maxPoints) };
            const set = (patch: Partial<Draft>) => {
              setSaved(null);
              setDrafts((p) => ({ ...p, [x.id]: { ...d, ...patch } }));
            };
            return (
              <li key={x.id} data-testid={`ticket-rule-${x.id}`}>
                <Card shadow="sm" bordered={false} className="p-4 space-y-3">
                  <div>
                    <p className="font-bold text-heading [overflow-wrap:anywhere]">{x.title}</p>
                    <p className="text-xs text-gray-700">{formatDateRange(x.startDate, x.endDate, locale)}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <select aria-label={tr("rowMode", { title: x.title })} value={d.mode} onChange={(e) => set({ mode: e.target.value as RefundMode })} className={fieldClasses()}>
                      <option value="none">{tr("modeNone")}</option>
                      <option value="refund">{tr("modeRefund")}</option>
                    </select>
                    <input aria-label={tr("rowPercent", { title: x.title })} inputMode="numeric" value={d.percent} disabled={d.mode !== "refund"} onChange={(e) => set({ percent: e.target.value })} className={fieldClasses(!valid(d))} />
                    <input aria-label={tr("rowMax", { title: x.title })} inputMode="numeric" value={d.max} disabled={d.mode !== "refund"} onChange={(e) => set({ max: e.target.value })} className={fieldClasses(!valid(d))} />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="secondaryOutline" size="xs" disabled={!valid(d)} onClick={() => save(x)} aria-label={tr("rowSave", { title: x.title })}>{t("save")}</Button>
                    {saved === x.id && <span role="status" className="text-sm text-green-800">{tr("saved")}</span>}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
