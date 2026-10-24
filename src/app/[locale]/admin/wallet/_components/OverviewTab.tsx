"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { formatNumber } from "@/lib/format";
import { errorKey, walletApi } from "@/lib/client/wallet-client";
import Card from "@/components/ui/Card";
import { fieldClasses } from "@/components/ui/FormField";
import { DownloadExcel } from "./shared";

interface Overview {
  wallets: number; outstandingPoints: number; pendingTopups: number; pendingWithdrawals: number; pendingWithdrawalPoints: number; pendingExpenses: number; ticketsNeedInvoice: number;
  mismatches: { userId: number; balance: number; ledgerTotal: number; lastBalanceAfter: number | null }[];
}

export default function OverviewTab({ onOpen }: { onOpen: (tab: string) => void }) {
  const t = useTranslations("adminWallet");
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  // The month of the statement for the accountant: last month by default (UTC).
  const monthId = useId();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
  });

  useEffect(() => {
    walletApi<Overview>("/api/admin/wallet/overview").then((res) => {
      if (!res.ok) setError(t(`errors.${errorKey(res.data.code)}`));
      else setData(res.data);
    });
  }, [t]);

  if (error) return <p role="alert" className="text-red-700">{error}</p>;
  if (!data) return <p className="text-gray-600">{t("loading")}</p>;

  const stats: { key: string; value: string; label: string; tab?: string; alert?: boolean }[] = [
    { key: "pendingTopups", value: formatNumber(data.pendingTopups), label: t("overview.pendingTopups"), tab: "topups", alert: data.pendingTopups > 0 },
    { key: "pendingWithdrawals", value: formatNumber(data.pendingWithdrawals), label: t("overview.pendingWithdrawals", { points: formatNumber(data.pendingWithdrawalPoints) }), tab: "withdrawals", alert: data.pendingWithdrawals > 0 },
    { key: "pendingExpenses", value: formatNumber(data.pendingExpenses), label: t("overview.pendingExpenses"), tab: "expenses", alert: data.pendingExpenses > 0 },
    { key: "ticketsNeedInvoice", value: formatNumber(data.ticketsNeedInvoice), label: t("overview.ticketsNeedInvoice"), tab: "expenses", alert: data.ticketsNeedInvoice > 0 },
    { key: "outstanding", value: `¥${formatNumber(data.outstandingPoints)}`, label: t("overview.outstanding"), tab: "wallets" },
    { key: "wallets", value: formatNumber(data.wallets), label: t("overview.wallets"), tab: "wallets" },
  ];

  return (
    <div className="space-y-6">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => s.tab && onOpen(s.tab)}
              className={`block h-full w-full rounded-[var(--radius-card)] p-5 text-left shadow-[var(--shadow-card-sm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 ${s.alert ? "bg-yellow-50" : "bg-white"}`}
            >
              <span className="block text-3xl font-extrabold text-heading">{s.value}</span>
              <span className="mt-1 block text-sm text-gray-700">{s.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <Card shadow="sm" bordered={false} className="p-5">
        <h2 className="text-lg font-bold text-heading mb-1">{t("overview.booksTitle")}</h2>
        {data.mismatches.length === 0 ? (
          <p role="status" className="text-green-800">✓ {t("overview.booksOk")}</p>
        ) : (
          <div role="alert">
            <p className="mb-2 font-semibold text-red-700">{t("overview.booksBad", { count: data.mismatches.length })}</p>
            <ul className="space-y-1 text-sm text-gray-800">
              {data.mismatches.map((m) => (
                <li key={m.userId}>{t("overview.mismatch", { id: m.userId, balance: formatNumber(m.balance), ledger: formatNumber(m.ledgerTotal) })}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card shadow="sm" bordered={false} className="p-5" data-testid="wallet-statement">
        <h2 className="text-lg font-bold text-heading mb-1">{t("statement.title")}</h2>
        <p className="mb-3 text-sm text-gray-700">{t("statement.help")}</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor={monthId} className="mb-1 block text-sm font-medium text-gray-700">{t("statement.month")}</label>
            <input id={monthId} type="month" value={month} max={new Date().toISOString().slice(0, 7)} onChange={(e) => setMonth(e.target.value)} className={fieldClasses()} />
          </div>
          <DownloadExcel path={`/api/admin/wallet/export/monthly?month=${encodeURIComponent(month)}`} fallbackName={`wallet-statement-${month}.xlsx`} label={t("statement.download")} />
        </div>
      </Card>
    </div>
  );
}
