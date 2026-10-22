"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/format";
import { formatInstantDateTime } from "@/lib/date-format";
import { fieldClasses } from "@/components/ui/FormField";
import { errorKey, pointsFromText, walletApi } from "@/lib/client/wallet-client";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { ImageViewer, ListFilters, PersonLine, ShowMore, StatusBadge, useAdminList, useDebounced, type Person } from "./shared";

interface Topup extends Person {
  id: number; points: number; approvedPoints: number | null; reference: string; note: string; status: string; adminNote: string;
  createdAt: string; reviewedAt: string | null;
}

export default function TopupsTab() {
  const t = useTranslations("adminWallet");
  const locale = useLocale();
  const ids = { points: useId(), note: useId() };
  const [status, setStatus] = useState("pending");
  const [q, setQ] = useState("");
  const search = useDebounced(q);
  const { items, hasMore, loading, error, reload, loadMore } = useAdminList<Topup>("/api/admin/wallet/topups", { status, q: search });
  const [openId, setOpenId] = useState<number | null>(null);
  const [proof, setProof] = useState<Record<number, string>>({});
  const [pointsText, setPointsText] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function open(row: Topup) {
    setMessage("");
    setOpenId(row.id);
    setPointsText(String(row.points));
    setNote("");
    if (!proof[row.id]) {
      const res = await walletApi<{ proof: string }>(`/api/admin/wallet/topups/${row.id}`);
      if (res.ok) setProof((p) => ({ ...p, [row.id]: res.data.proof }));
      else setMessage(t(`errors.${errorKey(res.data.code)}`));
    }
  }

  async function decide(row: Topup, action: "approve" | "reject") {
    const points = pointsFromText(pointsText);
    if (action === "approve" && points === null) {
      setMessage(t("errors.invalid_amount"));
      return;
    }
    setBusy(true);
    setMessage("");
    const res = await walletApi(`/api/admin/wallet/topups/${row.id}`, { method: "PATCH", body: { action, points, note } });
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
      <ListFilters statuses={["pending", "approved", "rejected", "cancelled"]} status={status} onStatus={setStatus} q={q} onQ={setQ} statusLabel={(s) => t(`status.${s}`)} />
      {error && <p role="alert" className="mb-3 text-red-700">{error}</p>}
      {!loading && items.length === 0 && !error && <p className="text-gray-600">{t("topups.empty")}</p>}
      <ul className="space-y-3">
        {items.map((row) => (
          <li key={row.id}>
            <Card shadow="sm" bordered={false} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <PersonLine person={row} />
                <div className="text-right">
                  <p className="text-xl font-extrabold text-heading">¥{formatNumber(row.approvedPoints ?? row.points)}</p>
                  <StatusBadge status={row.status} label={t(`status.${row.status}`)} />
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-700 [overflow-wrap:anywhere]">
                {row.reference && <span>{t("topups.reference")}: {row.reference} · </span>}
                {formatInstantDateTime(row.createdAt, locale)}
              </p>
              {row.note && <p className="text-sm text-gray-700 [overflow-wrap:anywhere]">{row.note}</p>}
              {row.adminNote && <p className="text-sm text-gray-600 [overflow-wrap:anywhere]">{t("adminNote")}: {row.adminNote}</p>}
              <div className="mt-3">
                {openId === row.id ? (
                  <div className="space-y-3 rounded-xl border border-gray-200 bg-cream-50 p-4">
                    {proof[row.id] ? <ImageViewer src={proof[row.id]} alt={t("topups.proofAlt")} /> : <p className="text-gray-600">{t("loading")}</p>}
                    {row.status === "pending" && (
                      <>
                        <div>
                          <label htmlFor={ids.points} className="block text-sm font-medium text-gray-700 mb-1.5">{t("topups.creditPoints")}</label>
                          <input id={ids.points} inputMode="numeric" value={pointsText} onChange={(e) => setPointsText(e.target.value)} className={fieldClasses()} />
                          <p className="mt-1 text-xs text-gray-600">{t("topups.creditHint", { points: formatNumber(row.points) })}</p>
                        </div>
                        <div>
                          <label htmlFor={ids.note} className="block text-sm font-medium text-gray-700 mb-1.5">{t("noteToBuyer")}</label>
                          <input id={ids.note} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} className={fieldClasses()} />
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button type="button" variant="gradientCta" size="compact" disabled={busy} onClick={() => decide(row, "approve")}>{t("topups.approve")}</Button>
                          <Button type="button" variant="ghostDanger" size="compact" disabled={busy} onClick={() => decide(row, "reject")}>{t("reject")}</Button>
                        </div>
                      </>
                    )}
                    {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
                    <Button type="button" variant="ghost" size="xs" onClick={() => setOpenId(null)}>{t("close")}</Button>
                  </div>
                ) : (
                  <Button type="button" variant={row.status === "pending" ? "save" : "ghost"} size="xs" onClick={() => open(row)}>{row.status === "pending" ? t("review") : t("viewProof")}</Button>
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
