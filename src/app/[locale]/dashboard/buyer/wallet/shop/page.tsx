"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatNumber } from "@/lib/format";
import { formatDateRange, formatInstantDateTime } from "@/lib/date-format";
import { errorKey, walletApi } from "@/lib/client/wallet-client";
import { newClientKey } from "@/lib/wallet";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import WalletLayout from "../_components/WalletLayout";

interface Tour { id: number; slug: string; title: string; startDate: string; endDate: string; pricePoints: number }
interface Purchase { id: number; tourId: number; tourTitle: string; tourSlug: string; points: number; status: string; createdAt: string }

const TONE: Record<string, BadgeTone> = { paid: "success", refunded: "gray" };

export default function WalletShopPage() {
  const t = useTranslations("buyerWallet");
  const locale = useLocale();
  const { user } = useAuth();
  const [tours, setTours] = useState<Tour[] | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [bought, setBought] = useState("");
  // One key per tour while it is being confirmed, so a double click buys once.
  const keys = useRef(new Map<number, string>());

  const isBuyer = user?.role === "buyer";

  const reload = useCallback(async () => {
    const [tr, pr, wr] = await Promise.all([
      walletApi<{ items: Tour[] }>("/api/wallet/tours"),
      walletApi<{ items: Purchase[] }>("/api/wallet/purchases"),
      walletApi<{ balance: number }>("/api/wallet"),
    ]);
    if (!tr.ok || !pr.ok || !wr.ok) {
      setError(t(`errors.${errorKey(tr.data.code || pr.data.code || wr.data.code)}`));
      return;
    }
    setTours(tr.data.items);
    setPurchases(pr.data.items);
    setBalance(wr.data.balance);
  }, [t]);

  useEffect(() => {
    if (isBuyer) reload();
  }, [isBuyer, reload]);

  async function buy(tour: Tour) {
    if (busy) return;
    setBusy(true);
    setError("");
    if (!keys.current.has(tour.id)) keys.current.set(tour.id, newClientKey());
    const res = await walletApi("/api/wallet/purchases", { method: "POST", body: { tourId: tour.id, key: keys.current.get(tour.id) } });
    setBusy(false);
    setConfirming(null);
    if (!res.ok) {
      setError(t(`errors.${errorKey(res.data.code)}`));
      return;
    }
    keys.current.delete(tour.id);
    setBought(tour.title);
    reload();
  }

  const owned = new Set(purchases.filter((p) => p.status === "paid").map((p) => p.tourId));

  return (
    <WalletLayout title={t("shop.title")} subtitle={t("shop.subtitle")}>
      <div className="space-y-6">
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {bought && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{t("shop.bought", { title: bought })}</p>}
        {balance !== null && <p className="text-gray-800">{t("shop.balance", { points: formatNumber(balance) })}</p>}

        <Card shadow="sm" bordered={false} className="p-6">
          <h2 className="text-lg font-bold text-heading mb-4">{t("shop.available")}</h2>
          {tours === null && <p className="text-gray-600">{t("loading")}</p>}
          {tours && tours.length === 0 && <p className="text-gray-600">{t("shop.none")}</p>}
          <ul className="divide-y divide-gray-100">
            {tours?.map((tour) => (
              <li key={tour.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/tours/${tour.slug}`} className="font-bold text-heading hover:underline [overflow-wrap:anywhere]">{tour.title}</Link>
                    <p className="text-sm text-gray-600">{formatDateRange(tour.startDate, tour.endDate, locale)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-extrabold text-heading">{formatNumber(tour.pricePoints)} <span className="text-sm font-semibold text-gray-600">{t("pointsUnit")}</span></p>
                    {owned.has(tour.id) ? (
                      <Badge tone="success" size="status">{t("shop.owned")}</Badge>
                    ) : confirming === tour.id ? null : (
                      <Button type="button" variant="gradientCta" size="xs" className="mt-1" onClick={() => setConfirming(tour.id)}>{t("shop.pay")}</Button>
                    )}
                  </div>
                </div>
                {confirming === tour.id && (
                  <div className="mt-3 rounded-xl border border-emerald-900/20 bg-cream-50 p-4" role="group" aria-label={t("shop.confirmTitle")}>
                    <p className="text-gray-800">{t("shop.confirmText", { points: formatNumber(tour.pricePoints), title: tour.title })}</p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Button type="button" variant="gradientCta" size="wide" disabled={busy} onClick={() => buy(tour)}>{busy ? t("sending") : t("shop.confirmButton")}</Button>
                      <Button type="button" variant="ghost" size="wide" disabled={busy} onClick={() => setConfirming(null)}>{t("cancel")}</Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-gray-600">{t("shop.afterBuying")}</p>
        </Card>

        <Card shadow="sm" bordered={false} className="p-6">
          <h2 className="text-lg font-bold text-heading mb-4">{t("shop.history")}</h2>
          {purchases.length === 0 && <p className="text-gray-600">{t("shop.historyEmpty")}</p>}
          <ul className="divide-y divide-gray-100">
            {purchases.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-heading [overflow-wrap:anywhere]">{p.tourTitle}</p>
                  <p className="text-xs text-gray-600">{formatInstantDateTime(p.createdAt, locale)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-heading">{formatNumber(p.points)}</span>
                  <Badge tone={TONE[p.status] || "gray"} size="status">{t(`status.${p.status}`)}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </WalletLayout>
  );
}
