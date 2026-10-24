"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatNumber } from "@/lib/format";
import { errorKey, walletApi } from "@/lib/client/wallet-client";
import Card from "@/components/ui/Card";
import WalletLayout from "../_components/WalletLayout";

interface Summary {
  balance: number;
  frozen: boolean;
  pendingWithdrawal: number;
  settings: { transferMax: number; transferDailyMax: number; withdrawMin: number; transfersEnabled: boolean; withdrawalsEnabled: boolean };
}
interface Tour { id: number; pricePoints: number }
interface Reward { id: number; points: number }

// "What can I do with my points?": every way to earn and to use points in one place, with what is possible for this buyer right now
// (the real limits, how many tours the balance covers, and what is switched off).
export default function WalletUsePage() {
  const t = useTranslations("buyerWallet");
  const tu = useTranslations("buyerWallet.use");
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [error, setError] = useState("");

  const isBuyer = user?.role === "buyer";
  useEffect(() => {
    if (!isBuyer) return;
    let stale = false;
    (async () => {
      const [s, tr, rw] = await Promise.all([
        walletApi<Summary>("/api/wallet"),
        walletApi<{ items: Tour[] }>("/api/wallet/tours"),
        walletApi<{ items: Reward[] }>("/api/wallet/rewards"),
      ]);
      if (stale) return;
      if (!s.ok) {
        setError(t(`errors.${errorKey(s.data.code)}`));
        return;
      }
      setSummary(s.data);
      if (tr.ok) setTours(tr.data.items);
      if (rw.ok) setRewards(rw.data.items);
    })();
    return () => {
      stale = true;
    };
  }, [isBuyer, t]);

  const affordable = summary ? tours.filter((x) => x.pricePoints <= summary.balance).length : 0;
  const cheapest = tours.length ? Math.min(...tours.map((x) => x.pricePoints)) : 0;
  const best = rewards.length ? Math.max(...rewards.map((x) => x.points)) : 0;

  const earn: { key: string; href: string; status: string }[] = [
    { key: "attend", href: "/dashboard/buyer/wallet", status: rewards.length > 0 ? tu("attendStatus", { count: rewards.length, points: formatNumber(best) }) : tu("attendNone") },
    { key: "expenses", href: "/dashboard/buyer/wallet/expenses", status: tu("expensesStatus") },
    { key: "topup", href: "/dashboard/buyer/wallet/topup", status: tu("topupStatus") },
  ];
  const spend: { key: string; href: string; status: string; off?: boolean }[] = summary
    ? [
        { key: "tours", href: "/dashboard/buyer/wallet/shop", status: tours.length === 0 ? tu("toursNone") : tu("toursStatus", { count: tours.length, cheapest: formatNumber(cheapest), affordable }) },
        summary.settings.transfersEnabled
          ? { key: "send", href: "/dashboard/buyer/wallet/send", status: tu("sendStatus", { max: formatNumber(summary.settings.transferMax), daily: formatNumber(summary.settings.transferDailyMax) }) }
          : { key: "send", href: "/dashboard/buyer/wallet/send", status: tu("switchedOff"), off: true },
        summary.settings.withdrawalsEnabled
          ? { key: "withdraw", href: "/dashboard/buyer/wallet/withdraw", status: tu("withdrawStatus", { min: formatNumber(summary.settings.withdrawMin), balance: formatNumber(summary.balance) }) }
          : { key: "withdraw", href: "/dashboard/buyer/wallet/withdraw", status: tu("switchedOff"), off: true },
      ]
    : [];

  const group = (title: string, items: { key: string; href: string; status: string; off?: boolean }[], testId: string) => (
    <div data-testid={testId}>
      <h2 className="text-xl font-bold text-heading">{title}</h2>
      <ul className="mt-3 grid gap-4 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.key} data-testid={`use-${i.key}`}>
            <Card shadow="sm" bordered={false} className="h-full p-5">
              <h3 className="font-bold text-heading">{tu(`${i.key}.title`)}</h3>
              <p className="mt-1 text-sm text-gray-800">{tu(`${i.key}.text`)}</p>
              <p className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${i.off ? "bg-gray-100 text-gray-800" : "bg-emerald-50 text-emerald-900"}`}>{i.status}</p>
              {!i.off && <p className="mt-3"><Link href={i.href} className="py-1 text-sm font-semibold text-emerald-800 underline">{tu(`${i.key}.open`)}</Link></p>}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <WalletLayout title={tu("title")} subtitle={tu("subtitle")} signInNext="/dashboard/buyer/wallet/use">
      {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
      {!summary && !error && <p className="text-center text-gray-700">{t("loading")}</p>}
      {summary && (
        <div className="space-y-8">
          <Card shadow="sm" bordered={false} className="p-5">
            <p className="text-sm font-semibold text-gray-700">{t("balance")}</p>
            <p className="text-4xl font-extrabold text-heading">{formatNumber(summary.balance)} <span className="text-lg font-bold text-gray-700">{t("pointsUnit")}</span></p>
            <p className="mt-1 text-sm text-gray-700">{tu("rate")}</p>
            {summary.frozen && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{t("frozenNotice")}</p>}
          </Card>
          {group(tu("spendTitle"), spend, "use-spend")}
          {group(tu("earnTitle"), earn, "use-earn")}
          <p className="text-sm text-gray-700">{tu("help")}</p>
        </div>
      )}
    </WalletLayout>
  );
}
