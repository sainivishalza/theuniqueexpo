"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/format";
import { formatInstantDateTime } from "@/lib/date-format";
import { errorKey, walletApi } from "@/lib/client/wallet-client";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { ListFilters, PersonLine, ShowMore, StatusBadge, useAdminList, useDebounced, type Person } from "./shared";

interface Purchase extends Person { id: number; tourId: number; tourTitle: string; points: number; status: string; adminNote: string; createdAt: string; refundedAt: string | null }

export default function PurchasesTab() {
  const t = useTranslations("adminWallet");
  const locale = useLocale();
  const [q, setQ] = useState("");
  const search = useDebounced(q);
  const { items, hasMore, loading, error, reload, loadMore } = useAdminList<Purchase>("/api/admin/wallet/purchases", { q: search });
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function refund(row: Purchase) {
    const note = window.prompt(t("purchases.refundPrompt", { points: formatNumber(row.points), name: row.name }), "");
    if (note === null) return;
    setBusyId(row.id);
    setMessage("");
    const res = await walletApi(`/api/admin/wallet/purchases/${row.id}`, { method: "PATCH", body: { action: "refund", note } });
    setBusyId(null);
    if (!res.ok) setMessage(t(`errors.${errorKey(res.data.code)}`));
    reload();
  }

  return (
    <div>
      <ListFilters statuses={[]} status="" onStatus={() => {}} q={q} onQ={setQ} statusLabel={(s) => s} />
      {(error || message) && <p role="alert" className="mb-3 text-red-700">{error || message}</p>}
      {!loading && items.length === 0 && !error && <p className="text-gray-600">{t("purchases.empty")}</p>}
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
              <p className="mt-2 font-semibold text-heading [overflow-wrap:anywhere]">{row.tourTitle}</p>
              <p className="text-xs text-gray-600">{formatInstantDateTime(row.createdAt, locale)}</p>
              {row.adminNote && <p className="text-sm text-gray-600 [overflow-wrap:anywhere]">{t("adminNote")}: {row.adminNote}</p>}
              {row.status === "paid" && (
                <div className="mt-3">
                  <Button type="button" variant="ghostDanger" size="xs" disabled={busyId === row.id} onClick={() => refund(row)}>{t("purchases.refund")}</Button>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
      <ShowMore hasMore={hasMore} loading={loading} onMore={loadMore} />
    </div>
  );
}
