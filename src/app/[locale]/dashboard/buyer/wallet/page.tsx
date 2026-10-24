"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatNumber } from "@/lib/format";
import { formatDateRange, formatInstantDateTime } from "@/lib/date-format";
import { errorKey, walletApi } from "@/lib/client/wallet-client";
import type { WalletTxType } from "@/lib/wallet";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import QrImage from "@/components/wallet/QrImage";
import WalletLayout from "./_components/WalletLayout";

interface Summary {
  balance: number;
  walletCode: string;
  frozen: boolean;
  buyerNumber: string;
  name: string;
  pendingWithdrawal: number;
}

interface Tx {
  id: number;
  amount: number;
  balanceAfter: number;
  type: WalletTxType;
  note: string;
  counterpartyName: string;
  counterpartyNumber: string;
  createdAt: string;
}

interface Reward { id: number; slug: string; title: string; startDate: string; endDate: string; points: number; region: string }

const TX_ICONS: Record<WalletTxType, string> = {
  attendance: "🎫",
  expense: "🧾",
  topup: "➕",
  transfer_in: "📥",
  transfer_out: "📤",
  withdrawal_hold: "🏦",
  withdrawal_refund: "↩️",
  purchase: "🧳",
  purchase_refund: "↩️",
  adjustment: "⚙️",
};

export default function BuyerWalletPage() {
  const t = useTranslations("buyerWallet");
  const locale = useLocale();
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [items, setItems] = useState<Tx[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [departureCity, setDepartureCity] = useState("");

  const isBuyer = user?.role === "buyer";
  useEffect(() => {
    setOrigin(window.location.origin);
    if (!isBuyer) return;
    let stale = false;
    (async () => {
      const [s, tx] = await Promise.all([walletApi<Summary>("/api/wallet"), walletApi<{ items: Tx[]; hasMore: boolean }>("/api/wallet/transactions")]);
      if (stale) return;
      if (!s.ok || !tx.ok) {
        setError(t(`errors.${errorKey(s.data.code || tx.data.code)}`));
        return;
      }
      setSummary(s.data);
      setItems(tx.data.items);
      setHasMore(tx.data.hasMore);
      const rw = await walletApi<{ items: Reward[]; departureCity: string }>("/api/wallet/rewards");
      if (!stale && rw.ok) {
        setRewards(rw.data.items);
        setDepartureCity(rw.data.departureCity);
      }
    })();
    return () => {
      stale = true;
    };
  }, [isBuyer, t]);

  const loadMore = useCallback(async () => {
    if (!items?.length) return;
    setLoadingMore(true);
    const res = await walletApi<{ items: Tx[]; hasMore: boolean }>(`/api/wallet/transactions?before=${items[items.length - 1].id}`);
    setLoadingMore(false);
    if (!res.ok) {
      setError(t(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setItems((prev) => [...(prev || []), ...res.data.items]);
    setHasMore(res.data.hasMore);
  }, [items, t]);

  const payLink = summary && origin ? `${origin}/dashboard/buyer/wallet/send?to=${summary.walletCode}` : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(payLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // the link is also shown in the box below, so it can be copied by hand
    }
  }

  return (
    <WalletLayout title={t("title")} subtitle={t("subtitle")}>
      {error && <p role="alert" className="mb-4 text-red-600">{error}</p>}
      {!summary && !error && <p className="text-center text-gray-500">{t("loading")}</p>}
      {summary && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card shadow="sm" bordered={false} className="p-6">
              <h2 className="text-sm font-semibold text-gray-600">{t("balance")}</h2>
              <p className="mt-1 text-5xl font-extrabold text-heading">
                {formatNumber(summary.balance)} <span className="text-lg font-bold text-gray-600">{t("pointsUnit")}</span>
              </p>
              <p className="mt-1 text-sm text-gray-600">{t("rate", { rmb: formatNumber(summary.balance) })}</p>
              {summary.pendingWithdrawal > 0 && (
                <p className="mt-3 rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-800">{t("pendingWithdrawal", { points: formatNumber(summary.pendingWithdrawal) })}</p>
              )}
              {summary.frozen && (
                <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{t("frozenNotice")}</p>
              )}
              <div className="mt-5 flex flex-wrap gap-3">
                <Button href="/dashboard/buyer/wallet/send" variant="gradientCta" size="wide">{t("tabs.send")}</Button>
                <Button href="/dashboard/buyer/wallet/topup" variant="secondaryOutline" size="wide">{t("tabs.topup")}</Button>
                <Button href="/dashboard/buyer/wallet/withdraw" variant="secondaryOutline" size="wide">{t("tabs.withdraw")}</Button>
              </div>
            </Card>

            <Card shadow="sm" bordered={false} className="p-6 text-center">
              <h2 className="text-sm font-semibold text-gray-600">{t("myQr")}</h2>
              <div className="mt-3 flex justify-center">
                {payLink ? <QrImage value={payLink} size={200} alt={t("qrAlt")} /> : <div className="h-[200px] w-[200px]" />}
              </div>
              <p className="mt-3 font-bold text-heading">{summary.name}</p>
              {summary.buyerNumber && <p className="text-sm text-gray-600">{summary.buyerNumber}</p>}
              <p className="mt-2 text-xs text-gray-600">{t("qrHint")}</p>
              <button
                type="button"
                onClick={copyLink}
                className="py-1 mt-3 text-sm font-semibold text-emerald-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 rounded-sm"
              >
                {copied ? t("copied") : t("copyLink")}
              </button>
            </Card>
          </div>

          {rewards.length > 0 && (
            <Card shadow="sm" bordered={false} className="p-6">
              <h2 className="text-lg font-bold text-heading">{t("rewards.title")}</h2>
              <p className="mb-3 text-sm text-gray-600">
                {departureCity ? t("rewards.basedOn", { city: departureCity }) : t("rewards.noCity")}{" "}
                <Link href="/dashboard/buyer/profile" className="font-semibold text-emerald-700 hover:underline">{t("rewards.editProfile")}</Link>
              </p>
              <ul className="divide-y divide-gray-100">
                {rewards.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/exhibitions/${r.slug}`} className="font-semibold text-heading hover:underline [overflow-wrap:anywhere]">{r.title}</Link>
                      <p className="text-xs text-gray-600">{formatDateRange(r.startDate, r.endDate, locale)}{r.region ? ` · ${r.region}` : ""}</p>
                    </div>
                    <p className="text-lg font-extrabold text-green-700">+{formatNumber(r.points)} <span className="text-sm font-semibold text-gray-600">{t("pointsUnit")}</span></p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-gray-600">{t("rewards.howEarned")}</p>
            </Card>
          )}

          <Card shadow="sm" bordered={false} className="p-6">
            <h2 className="text-lg font-bold text-heading mb-4">{t("statement")}</h2>
            {items && items.length === 0 && <p className="text-gray-600">{t("statementEmpty")}</p>}
            <ul className="divide-y divide-gray-100">
              {items?.map((tx) => (
                <li key={tx.id} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 text-xl" aria-hidden="true">{TX_ICONS[tx.type] || "•"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-heading">{t(`types.${tx.type}`)}</p>
                    {(tx.counterpartyName || tx.note) && (
                      <p className="text-sm text-gray-600 [overflow-wrap:anywhere]">
                        {tx.counterpartyName && <span>{tx.counterpartyName} {tx.counterpartyNumber}</span>}
                        {tx.counterpartyName && tx.note ? " · " : ""}
                        {tx.note}
                      </p>
                    )}
                    <p className="text-xs text-gray-600">{formatInstantDateTime(tx.createdAt, locale)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${tx.amount > 0 ? "text-green-700" : "text-red-700"}`}>
                      {tx.amount > 0 ? "+" : "−"}{formatNumber(Math.abs(tx.amount))}
                    </p>
                    <p className="text-xs text-gray-600">{t("balanceAfter", { points: formatNumber(tx.balanceAfter) })}</p>
                  </div>
                </li>
              ))}
            </ul>
            {hasMore && (
              <div className="mt-4 text-center">
                <Button type="button" variant="ghost" size="compact" onClick={loadMore} disabled={loadingMore}>{t("showMore")}</Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </WalletLayout>
  );
}
