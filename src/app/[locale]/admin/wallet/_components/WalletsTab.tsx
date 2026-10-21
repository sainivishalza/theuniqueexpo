"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/format";
import { formatInstantDateTime } from "@/lib/date-format";
import { fieldClasses } from "@/components/ui/FormField";
import { errorKey, walletApi } from "@/lib/client/wallet-client";
import { newClientKey } from "@/lib/wallet";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { DownloadExcel, ListFilters, PersonLine, ShowMore, useAdminList, useDebounced, type Person } from "./shared";

interface WalletRow extends Person { balance: number; frozen: boolean; suspended: boolean }
interface Tx { id: number; amount: number; balanceAfter: number; type: string; note: string; createdAt: string; counterparty: string; by: string }
interface Detail { wallet: WalletRow; hasMore: boolean; transactions: Tx[] }

function WalletDetail({ userId, onChanged }: { userId: number; onChanged: () => void }) {
  const t = useTranslations("adminWallet");
  const locale = useLocale();
  const ids = { amount: useId(), reason: useId() };
  const [detail, setDetail] = useState<Detail | null>(null);
  const [amountText, setAmountText] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [moreBusy, setMoreBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await walletApi<Detail>(`/api/admin/wallet/wallets/${userId}`);
    if (!res.ok) {
      setMessage(t(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setDetail(res.data);
  }, [userId, t]);

  useEffect(() => {
    load();
  }, [load]);

  // One request key per distinct adjustment, so a double click cannot add the points twice.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const key = useMemo(() => newClientKey(), [amountText, reason, userId]);
  const amount = /^[+-]?\d{1,8}$/.test(amountText.trim()) ? Number(amountText.trim()) : null;

  async function adjust() {
    if (amount === null || amount === 0 || reason.trim().length < 3) return;
    if (!window.confirm(t("wallets.adjustConfirm", { amount: (amount > 0 ? "+" : "") + formatNumber(amount) }))) return;
    setBusy(true);
    setMessage("");
    const res = await walletApi(`/api/admin/wallet/wallets/${userId}`, { method: "POST", body: { action: "adjust", amount, note: reason, key } });
    setBusy(false);
    if (!res.ok) {
      setMessage(t(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setAmountText("");
    setReason("");
    await load();
    onChanged();
  }

  async function freeze(frozen: boolean) {
    setBusy(true);
    const res = await walletApi(`/api/admin/wallet/wallets/${userId}`, { method: "POST", body: { action: frozen ? "freeze" : "unfreeze" } });
    setBusy(false);
    if (!res.ok) setMessage(t(`errors.${errorKey(res.data.code)}`));
    await load();
    onChanged();
  }

  async function more() {
    if (!detail?.transactions.length) return;
    setMoreBusy(true);
    const res = await walletApi<Detail>(`/api/admin/wallet/wallets/${userId}?before=${detail.transactions[detail.transactions.length - 1].id}`);
    setMoreBusy(false);
    if (res.ok) setDetail({ ...detail, hasMore: res.data.hasMore, transactions: [...detail.transactions, ...res.data.transactions] });
  }

  if (!detail) return <p className="text-gray-600">{message || t("loading")}</p>;
  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-cream-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-2xl font-extrabold text-heading">{formatNumber(detail.wallet.balance)} <span className="text-sm font-semibold text-gray-600">{t("points")}</span></p>
        <Button type="button" variant={detail.wallet.frozen ? "gradientCta" : "ghostDanger"} size="compact" disabled={busy} onClick={() => freeze(!detail.wallet.frozen)}>
          {detail.wallet.frozen ? t("wallets.unfreeze") : t("wallets.freeze")}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
        <div>
          <label htmlFor={ids.amount} className="block text-sm font-medium text-gray-700 mb-1.5">{t("wallets.adjustAmount")}</label>
          <input id={ids.amount} value={amountText} onChange={(e) => setAmountText(e.target.value)} placeholder="+100 / -50" autoComplete="off" className={fieldClasses(amountText !== "" && (amount === null || amount === 0))} />
        </div>
        <div>
          <label htmlFor={ids.reason} className="block text-sm font-medium text-gray-700 mb-1.5">{t("wallets.adjustReason")}</label>
          <input id={ids.reason} value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} autoComplete="off" className={fieldClasses()} />
        </div>
        <Button type="button" variant="gradientCta" size="compact" disabled={busy || amount === null || amount === 0 || reason.trim().length < 3} onClick={adjust}>{t("wallets.adjust")}</Button>
      </div>
      {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
      <div>
        <h3 className="mb-2 font-bold text-heading">{t("wallets.ledger")}</h3>
        {detail.transactions.length === 0 && <p className="text-gray-600">{t("wallets.ledgerEmpty")}</p>}
        <ul className="divide-y divide-gray-200">
          {detail.transactions.map((tx) => (
            <li key={tx.id} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-heading">{t(`types.${tx.type}`)}{tx.counterparty ? ` · ${tx.counterparty}` : ""}</p>
                {tx.note && <p className="text-sm text-gray-700 [overflow-wrap:anywhere]">{tx.note}</p>}
                <p className="text-xs text-gray-600">{formatInstantDateTime(tx.createdAt, locale)}{tx.by ? ` · ${t("wallets.by", { name: tx.by })}` : ""}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${tx.amount > 0 ? "text-green-700" : "text-red-700"}`}>{tx.amount > 0 ? "+" : "−"}{formatNumber(Math.abs(tx.amount))}</p>
                <p className="text-xs text-gray-600">{formatNumber(tx.balanceAfter)}</p>
              </div>
            </li>
          ))}
        </ul>
        <ShowMore hasMore={detail.hasMore} loading={moreBusy} onMore={more} />
      </div>
    </div>
  );
}

// All point movements as an Excel file, for a date range or for everything.
function MovementsExport() {
  const t = useTranslations("adminWallet");
  const ids = { from: useId(), to: useId() };
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-3">
      <div>
        <label htmlFor={ids.from} className="mb-1 block text-sm font-medium text-gray-700">{t("export.from")}</label>
        <input id={ids.from} type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={fieldClasses()} />
      </div>
      <div>
        <label htmlFor={ids.to} className="mb-1 block text-sm font-medium text-gray-700">{t("export.to")}</label>
        <input id={ids.to} type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={fieldClasses()} />
      </div>
      <DownloadExcel path={`/api/admin/wallet/export/transactions${query ? `?${query}` : ""}`} fallbackName="point-movements.xlsx" label={t("export.movements")} />
      <p className="basis-full text-xs text-gray-600">{t("export.rangeHint")}</p>
    </div>
  );
}

export default function WalletsTab() {
  const t = useTranslations("adminWallet");
  const [q, setQ] = useState("");
  const search = useDebounced(q);
  const { items, hasMore, loading, error, reload, loadMore } = useAdminList<WalletRow>("/api/admin/wallet/wallets", { q: search });
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div>
      <MovementsExport />
      <ListFilters statuses={[]} status="" onStatus={() => {}} q={q} onQ={setQ} statusLabel={(s) => s} />
      {error && <p role="alert" className="mb-3 text-red-700">{error}</p>}
      {!loading && items.length === 0 && !error && <p className="text-gray-600">{t("wallets.empty")}</p>}
      <ul className="space-y-3">
        {items.map((row) => (
          <li key={row.userId}>
            <Card shadow="sm" bordered={false} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <PersonLine person={row} />
                <div className="text-right">
                  <p className="text-xl font-extrabold text-heading">{formatNumber(row.balance)}</p>
                  <div className="flex flex-wrap justify-end gap-1">
                    {row.frozen && <Badge tone="danger" size="status">{t("wallets.frozen")}</Badge>}
                    {row.suspended && <Badge tone="warning" size="status">{t("wallets.suspended")}</Badge>}
                  </div>
                </div>
              </div>
              <div className="mt-3">
                {openId === row.userId ? (
                  <div className="space-y-3">
                    <WalletDetail userId={row.userId} onChanged={reload} />
                    <Button type="button" variant="ghost" size="xs" onClick={() => setOpenId(null)}>{t("close")}</Button>
                  </div>
                ) : (
                  <Button type="button" variant="ghost" size="xs" onClick={() => setOpenId(row.userId)}>{t("details")}</Button>
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
