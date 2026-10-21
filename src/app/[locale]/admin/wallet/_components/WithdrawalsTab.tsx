"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/format";
import { formatInstantDateTime } from "@/lib/date-format";
import { fieldClasses } from "@/components/ui/FormField";
import { errorKey, walletApi } from "@/lib/client/wallet-client";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { DownloadExcel, ImageViewer, ListFilters, PersonLine, ShowMore, StatusBadge, useAdminList, useDebounced, type Person } from "./shared";

interface Withdrawal extends Person {
  id: number; points: number; method: "alipay" | "wechat" | "bank"; accountName: string; bankName: string; bankBranch: string; bankAccount: string;
  hasQr: boolean; note: string; status: string; payoutReference: string; adminNote: string; createdAt: string; processedAt: string | null;
}

function Detail({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold text-gray-600">{label}</dt>
      <dd className="font-semibold text-heading [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

export default function WithdrawalsTab() {
  const t = useTranslations("adminWallet");
  const locale = useLocale();
  const ids = { ref: useId(), note: useId() };
  const [status, setStatus] = useState("pending");
  const [q, setQ] = useState("");
  const search = useDebounced(q);
  const { items, hasMore, loading, error, reload, loadMore } = useAdminList<Withdrawal>("/api/admin/wallet/withdrawals", { status, q: search });
  const [openId, setOpenId] = useState<number | null>(null);
  const [qr, setQr] = useState<Record<number, string>>({});
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function open(row: Withdrawal) {
    setMessage("");
    setOpenId(row.id);
    setReference("");
    setNote("");
    if (row.hasQr && !qr[row.id]) {
      const res = await walletApi<{ qr: string }>(`/api/admin/wallet/withdrawals/${row.id}`);
      if (res.ok) setQr((p) => ({ ...p, [row.id]: res.data.qr }));
      else setMessage(t(`errors.${errorKey(res.data.code)}`));
    }
  }

  async function decide(row: Withdrawal, action: "paid" | "reject") {
    if (action === "paid" && !window.confirm(t("withdrawals.paidConfirm", { points: formatNumber(row.points), name: row.name }))) return;
    if (action === "reject" && !window.confirm(t("withdrawals.rejectConfirm", { points: formatNumber(row.points) }))) return;
    setBusy(true);
    setMessage("");
    const res = await walletApi(`/api/admin/wallet/withdrawals/${row.id}`, { method: "PATCH", body: { action, reference, note } });
    setBusy(false);
    if (!res.ok) {
      setMessage(t(`errors.${errorKey(res.data.code)}`));
      if (res.data.code === "already_processed") reload();
      return;
    }
    setOpenId(null);
    reload();
  }

  return (
    <div>
      <div className="mb-3"><DownloadExcel path={`/api/admin/wallet/export/withdrawals?status=${encodeURIComponent(status)}`} fallbackName="withdrawals.xlsx" label={t("export.withdrawals")} /></div>
      <ListFilters statuses={["pending", "paid", "rejected", "cancelled"]} status={status} onStatus={setStatus} q={q} onQ={setQ} statusLabel={(s) => t(`status.${s}`)} />
      {error && <p role="alert" className="mb-3 text-red-700">{error}</p>}
      {!loading && items.length === 0 && !error && <p className="text-gray-600">{t("withdrawals.empty")}</p>}
      <ul className="space-y-3">
        {items.map((row) => (
          <li key={row.id}>
            <Card shadow="sm" bordered={false} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <PersonLine person={row} />
                <div className="text-right">
                  <p className="text-xl font-extrabold text-heading">¥{formatNumber(row.points)}</p>
                  <StatusBadge status={row.status} label={t(`status.${row.status}`)} />
                </div>
              </div>
              <p className="mt-2 text-sm font-semibold text-gray-800">{t(`methods.${row.method}`)} · <span className="font-normal text-gray-700">{formatInstantDateTime(row.createdAt, locale)}</span></p>
              {row.payoutReference && <p className="text-sm text-gray-700 [overflow-wrap:anywhere]">{t("withdrawals.reference")}: {row.payoutReference}</p>}
              {row.adminNote && <p className="text-sm text-gray-600 [overflow-wrap:anywhere]">{t("adminNote")}: {row.adminNote}</p>}
              <div className="mt-3">
                {openId === row.id ? (
                  <div className="space-y-3 rounded-xl border border-gray-200 bg-cream-50 p-4">
                    <dl className="grid gap-3 sm:grid-cols-2">
                      <Detail label={row.method === "bank" ? t("withdrawals.holder") : t("withdrawals.accountName")} value={row.accountName} />
                      <Detail label={t("withdrawals.bankName")} value={row.bankName} />
                      <Detail label={t("withdrawals.branch")} value={row.bankBranch} />
                      <Detail label={t("withdrawals.account")} value={row.bankAccount} />
                      <Detail label={t("withdrawals.buyerNote")} value={row.note} />
                    </dl>
                    {row.hasQr && (qr[row.id] ? <ImageViewer src={qr[row.id]} alt={t("withdrawals.qrAlt", { method: t(`methods.${row.method}`) })} /> : <p className="text-gray-600">{t("loading")}</p>)}
                    {row.status === "pending" && (
                      <>
                        <div>
                          <label htmlFor={ids.ref} className="block text-sm font-medium text-gray-700 mb-1.5">{t("withdrawals.reference")}</label>
                          <input id={ids.ref} value={reference} maxLength={150} onChange={(e) => setReference(e.target.value)} className={fieldClasses()} />
                        </div>
                        <div>
                          <label htmlFor={ids.note} className="block text-sm font-medium text-gray-700 mb-1.5">{t("noteToBuyer")}</label>
                          <input id={ids.note} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} className={fieldClasses()} />
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button type="button" variant="gradientCta" size="compact" disabled={busy} onClick={() => decide(row, "paid")}>{t("withdrawals.markPaid")}</Button>
                          <Button type="button" variant="ghostDanger" size="compact" disabled={busy} onClick={() => decide(row, "reject")}>{t("withdrawals.rejectReturn")}</Button>
                        </div>
                      </>
                    )}
                    {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
                    <Button type="button" variant="ghost" size="xs" onClick={() => setOpenId(null)}>{t("close")}</Button>
                  </div>
                ) : (
                  <Button type="button" variant="ghost" size="xs" onClick={() => open(row)}>{row.status === "pending" ? t("withdrawals.payOut") : t("details")}</Button>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <ShowMore hasMore={hasMore} loading={loading} onMore={loadMore} />
    </div>
  );
}
